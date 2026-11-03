export function publicUser(user) {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}
