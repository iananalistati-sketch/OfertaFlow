import type {Metadata} from 'next';import './globals.css';
export const metadata:Metadata={title:'OfertaFlow | Central de Afiliados',description:'Gestão de campanhas e convites por nicho'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>}
