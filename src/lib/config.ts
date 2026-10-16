export const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
export const mockNiches = [
 { slug:'tecnologia', name:'Tecnologia', emoji:'💻', interval:60 },
 { slug:'games', name:'Games', emoji:'🎮', interval:60 },
 { slug:'casa', name:'Casa', emoji:'🏠', interval:60 },
 { slug:'todas-ofertas', name:'Todas as Ofertas', emoji:'🔥', interval:30 },
];
export const mockProducts=[
 { id:'P001',title:'Fone sem fio Bluetooth',niche:'Tecnologia',platform:'Shopee (simulado)',price:'R$ 129,90',status:'Pendente' },
 { id:'P002',title:'Mouse gamer RGB',niche:'Games',platform:'AliExpress (simulado)',price:'R$ 89,90',status:'Pendente' },
 { id:'P003',title:'Luminária de mesa LED',niche:'Casa',platform:'Shopee (simulado)',price:'R$ 69,90',status:'Pendente' },
 { id:'P004',title:'Teclado mecânico compacto',niche:'Games · Tecnologia',platform:'AliExpress (simulado)',price:'R$ 199,90',status:'Pendente' },
];
