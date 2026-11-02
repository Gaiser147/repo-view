export const palette=['#46bcff','#6ee7e0','#4f7dff','#b29cff','#f2b86f','#80a3ce'];
export function groupColor(group:string,groups:string[]):string{return palette[Math.max(0,groups.indexOf(group))%palette.length];}
