export function canEditProject(user, project) {
  if (user.role === 'ADMIN') return true;
  return user.role === 'MANAGER' && project.managerId === user.id;
}

export function canAddProgress(user, project) {
  if (user.role === 'ADMIN') return true;
  if (user.role === 'MANAGER' && project.managerId === user.id) return true;
  return user.role === 'FIELD_OFFICER'
    && project.members?.some((member) => member.userId === user.id);
}

export function canManageUsers(user) {
  return user.role === 'ADMIN';
}
