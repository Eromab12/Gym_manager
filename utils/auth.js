let users = [];

export const registerUser = (user) => {
  users.push(user);
};

export const authenticateUser = (identifier, password) => {
  const user = users.find(
    (u) => (u.name === identifier || u.idCard === identifier) && u.password === password
  );
  return user || null;
};