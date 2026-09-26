import { requireAdmin,failure } from '@/lib/auth';
export const dynamic='force-dynamic';
export async function GET(){try{const {user,role}=await requireAdmin();return Response.json({email:user.email,role},{headers:{'Cache-Control':'private, no-store'}});}catch(error){return failure(error);}}
