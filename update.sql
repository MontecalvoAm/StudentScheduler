UPDATE M_User SET UserToken = UUID() WHERE UserToken IS NULL;
