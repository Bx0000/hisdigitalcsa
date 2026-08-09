import { listUsers, json } from "./_shared/auth";

export default async () => {
  try {
    const users = await listUsers();
    return json(200, { bootstrapped: users.length > 0 });
  } catch (err) {
    return json(500, { error: (err as Error).message });
  }
};

