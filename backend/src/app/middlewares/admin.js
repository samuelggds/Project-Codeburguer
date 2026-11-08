import User from "../models/User";

// Verify the current database role, never a client-side or token role flag.
export default async function adminMiddleware(request, response, next) {
  try {
    const user = await User.findByPk(request.userId);
    if (!user) return response.status(401).json({ error: "Sessão inválida" });
    if (user.admin !== true) return response.status(403).json({ error: "Acesso restrito a administradores" });
    request.adminUser = user;
    return next();
  } catch (error) {
    console.error("Erro ao verificar acesso administrativo", error);
    return response.status(500).json({ error: "Não foi possível verificar o acesso" });
  }
}
