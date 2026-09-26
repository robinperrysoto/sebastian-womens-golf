export type AdminRole='owner'|'admin';
export function isOwner(role:unknown):role is 'owner'{return role==='owner';}
export function originAllowed(origin:string|null,appUrl:string|undefined){
  if(!origin||!appUrl)return false;
  try{return new URL(origin).origin===new URL(appUrl).origin;}catch{return false;}
}
export function canBootstrapOwner(email:string|undefined,confirmed:string|undefined,ownerEmail:string|undefined){return !!(email&&confirmed&&ownerEmail&&email.toLowerCase()===ownerEmail.trim().toLowerCase());}
