import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ROLES, AuthError } from "@/lib/auth/rbac";
import { applySecurityHeaders } from "@/lib/security/headers";
import crypto from "crypto";

function generateToken() {
  return crypto.randomBytes(16).toString("hex");
}

export async function GET(req: NextRequest) {
  try {
    // Both Admin and Instructors can view custom study plans; students can view their own
    const user = await requireRole(req, ROLES.STUDENT);
    const { searchParams } = req.nextUrl;
    let studentNumber = searchParams.get("studentNumber");

    // If student, override and force their own student number
    if (user.role === ROLES.STUDENT) {
      const dbStudent = await prisma.m_Student.findUnique({
        where: { UserId: user.userId },
        select: { StudentNumber: true }
      });
      if (!dbStudent) {
        return applySecurityHeaders(NextResponse.json({ error: "NOT_FOUND", message: "Student profile not found." }, { status: 404 }));
      }
      studentNumber = dbStudent.StudentNumber;
    }

    if (!studentNumber) {
      return applySecurityHeaders(NextResponse.json({ error: "VALIDATION_ERROR", message: "studentNumber query param is required." }, { status: 400 }));
    }

    const student = await prisma.m_Student.findUnique({
      where: { StudentNumber: studentNumber, DeletedAt: null },
      include: {
        Course: true,
        User: {
          select: { FirstName: true, LastName: true, Email: true }
        }
      }
    });

    if (!student) {
      return applySecurityHeaders(NextResponse.json({ error: "NOT_FOUND", message: "Student not found." }, { status: 404 }));
    }

    // 1. Get or create Study Plan
    let studyPlan = await prisma.t_StudentStudyPlan.findUnique({
      where: { StudentId: student.StudentId, DeletedAt: null },
      include: {
        Subjects: {
          where: { DeletedAt: null },
          include: {
            Subject: {
              select: {
                SubjectToken: true,
                SubjectCode: true,
                SubjectName: true,
                Units: true,
              }
            }
          }
        }
      }
    });

    if (!studyPlan) {
      studyPlan = await prisma.t_StudentStudyPlan.create({
        data: {
          StudyPlanToken: generateToken(),
          StudentId: student.StudentId,
        },
        include: {
          Subjects: {
            include: {
              Subject: {
                select: {
                  SubjectToken: true,
                  SubjectCode: true,
                  SubjectName: true,
                  Units: true,
                }
              }
            }
          }
        }
      });
    }

    // Get all completed subjects
    const completedSubjectIds = new Set(
      studyPlan.Subjects.filter(s => s.Status === "COMPLETED").map(s => s.SubjectId)
    );

    // 2. Load prerequisites for all subjects
    const prerequisites = await prisma.m_SubjectPrerequisite.findMany({
      where: { DeletedAt: null },
      include: {
        PrerequisiteSubject: {
          select: { SubjectCode: true, SubjectName: true }
        }
      }
    });

    // Map subjectId -> list of prerequisite subjects
    const prereqMap: Record<number, any[]> = {};
    prerequisites.forEach(p => {
      if (!prereqMap[p.SubjectId]) prereqMap[p.SubjectId] = [];
      prereqMap[p.SubjectId].push({
        SubjectId: p.PrerequisiteSubjectId,
        SubjectCode: p.PrerequisiteSubject.SubjectCode,
        SubjectName: p.PrerequisiteSubject.SubjectName,
        Satisfied: completedSubjectIds.has(p.PrerequisiteSubjectId)
      });
    });

    // 3. Find floating subjects (subjects mapped in course or active in system where prerequisites are met, but not completed)
    const allActiveSubjects = await prisma.m_Subject.findMany({
      where: { IsActive: true, DeletedAt: null },
      select: {
        SubjectId: true,
        SubjectToken: true,
        SubjectCode: true,
        SubjectName: true,
        Units: true,
      }
    });

    const floatingSubjects = allActiveSubjects.filter(sub => {
      // Exclude if already completed or currently in study plan
      const inPlan = studyPlan!.Subjects.some(ps => ps.SubjectId === sub.SubjectId);
      if (inPlan) return false;

      // Check prerequisites
      const reqs = prereqMap[sub.SubjectId] || [];
      const allMet = reqs.every(r => completedSubjectIds.has(r.SubjectId));
      return allMet;
    });

    return applySecurityHeaders(NextResponse.json({
      success: true,
      student: {
        StudentNumber: student.StudentNumber,
        FirstName: student.User.FirstName,
        LastName: student.User.LastName,
        Email: student.User.Email,
        CourseName: student.Course?.CourseName || "N/A",
      },
      studyPlan: {
        StudyPlanToken: studyPlan.StudyPlanToken,
        Subjects: studyPlan.Subjects.map(s => ({
          StudyPlanSubjectToken: s.StudyPlanSubjectToken,
          TargetYearLevel: s.TargetYearLevel,
          TargetSemester: s.TargetSemester,
          Status: s.Status,
          Subject: s.Subject,
          Prerequisites: prereqMap[s.SubjectId] || []
        }))
      },
      floatingSubjects: floatingSubjects.map(s => ({
        SubjectToken: s.SubjectToken,
        SubjectCode: s.SubjectCode,
        SubjectName: s.SubjectName,
        Units: s.Units,
        Prerequisites: prereqMap[s.SubjectId] || []
      }))
    }));

  } catch (error) {
    if (error instanceof AuthError) {
      return applySecurityHeaders(
        NextResponse.json({ error: error.code, message: error.message }, { status: error.statusCode })
      );
    }
    return applySecurityHeaders(NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 }));
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(req, ROLES.ADMIN);
    const body = await req.json();
    const { StudyPlanToken, SubjectToken, TargetYearLevel, TargetSemester, Status } = body;

    if (!StudyPlanToken || !SubjectToken || !TargetYearLevel || !TargetSemester) {
      return applySecurityHeaders(NextResponse.json({ error: "VALIDATION_ERROR", message: "All parameters are required." }, { status: 400 }));
    }

    const [studyPlan, subject] = await Promise.all([
      prisma.t_StudentStudyPlan.findUnique({ where: { StudyPlanToken, DeletedAt: null } }),
      prisma.m_Subject.findUnique({ where: { SubjectToken, DeletedAt: null } })
    ]);

    if (!studyPlan || !subject) {
      return applySecurityHeaders(NextResponse.json({ error: "NOT_FOUND", message: "Study plan or Subject not found." }, { status: 404 }));
    }

    // Prerequisite Validation
    const prereqs = await prisma.m_SubjectPrerequisite.findMany({
      where: { SubjectId: subject.SubjectId, DeletedAt: null }
    });

    if (prereqs.length > 0) {
      const completedPrereqs = await prisma.t_StudentStudyPlanSubject.findMany({
        where: {
          StudyPlanId: studyPlan.StudyPlanId,
          SubjectId: { in: prereqs.map(p => p.PrerequisiteSubjectId) },
          Status: "COMPLETED",
          DeletedAt: null
        }
      });

      if (completedPrereqs.length < prereqs.length) {
        return applySecurityHeaders(NextResponse.json({
          error: "PREREQUISITE_FAILED",
          message: "Student has not completed all prerequisite subjects."
        }, { status: 400 }));
      }
    }

    const token = generateToken();

    const newPlanSubject = await prisma.t_StudentStudyPlanSubject.create({
      data: {
        StudyPlanSubjectToken: token,
        StudyPlanId: studyPlan.StudyPlanId,
        SubjectId: subject.SubjectId,
        TargetYearLevel: parseInt(TargetYearLevel, 10),
        TargetSemester: parseInt(TargetSemester, 10),
        Status: Status || "PENDING",
        CreatedBy: user.userId,
      }
    });

    return applySecurityHeaders(NextResponse.json({ success: true, planSubject: newPlanSubject }));
  } catch (error: any) {
    if (error instanceof AuthError) {
      return applySecurityHeaders(
        NextResponse.json({ error: error.code, message: error.message }, { status: error.statusCode })
      );
    }
    if (error.code === "P2002") {
      return applySecurityHeaders(NextResponse.json({ error: "DUPLICATE_ERROR", message: "Subject is already in student's study plan." }, { status: 400 }));
    }
    return applySecurityHeaders(NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 }));
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireRole(req, ROLES.ADMIN);
    const body = await req.json();
    const { StudyPlanSubjectToken, TargetYearLevel, TargetSemester, Status } = body;

    if (!StudyPlanSubjectToken) {
      return applySecurityHeaders(NextResponse.json({ error: "VALIDATION_ERROR", message: "StudyPlanSubjectToken is required." }, { status: 400 }));
    }

    const updated = await prisma.t_StudentStudyPlanSubject.update({
      where: { StudyPlanSubjectToken },
      data: {
        TargetYearLevel: TargetYearLevel !== undefined ? parseInt(TargetYearLevel, 10) : undefined,
        TargetSemester: TargetSemester !== undefined ? parseInt(TargetSemester, 10) : undefined,
        Status: Status,
        UpdatedBy: user.userId,
      }
    });

    return applySecurityHeaders(NextResponse.json({ success: true, planSubject: updated }));
  } catch (error) {
    if (error instanceof AuthError) {
      return applySecurityHeaders(
        NextResponse.json({ error: error.code, message: error.message }, { status: error.statusCode })
      );
    }
    return applySecurityHeaders(NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 }));
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireRole(req, ROLES.ADMIN);
    const { searchParams } = req.nextUrl;
    const planSubjectToken = searchParams.get("planSubjectToken");

    if (!planSubjectToken) {
      return applySecurityHeaders(NextResponse.json({ error: "VALIDATION_ERROR", message: "planSubjectToken is required." }, { status: 400 }));
    }

    await prisma.t_StudentStudyPlanSubject.update({
      where: { StudyPlanSubjectToken: planSubjectToken },
      data: {
        DeletedAt: new Date(),
        DeletedBy: user.userId,
      }
    });

    return applySecurityHeaders(NextResponse.json({ success: true }));
  } catch (error) {
    if (error instanceof AuthError) {
      return applySecurityHeaders(
        NextResponse.json({ error: error.code, message: error.message }, { status: error.statusCode })
      );
    }
    return applySecurityHeaders(NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 }));
  }
}
