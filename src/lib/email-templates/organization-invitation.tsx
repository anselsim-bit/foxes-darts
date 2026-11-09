import { Html, Head, Body, Container, Heading, Text, Link } from "@react-email/components";
export function OrganizationInvitation({organizationName,url}:{organizationName:string;url:string}) {
 return <Html lang="fr"><Head/><Body><Container><Heading>Invitation — {organizationName}</Heading><Text>Vous êtes invité à rejoindre l’équipe de {organizationName} sur Foxes Darts.</Text><Text>Connectez-vous avec l’adresse qui a reçu cet e-mail. Cette invitation expire dans sept jours.</Text><Link href={url}>Consulter l’invitation</Link></Container></Body></Html>;
}
export const template={component:OrganizationInvitation,subject:(data:Record<string,any>)=>`Invitation à rejoindre ${data["organizationName"]??"votre organisation"}`,displayName:"Invitation organisation"};
