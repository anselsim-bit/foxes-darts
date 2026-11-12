import React from 'react'
import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  participantName?: string
  tournamentTitle?: string
  organizationName?: string
  tournamentDate?: string
  time?: string
  location?: string
  organizerContact?: string
  rules?: string[]
  tournamentUrl?: string
}

const Email = ({ participantName, tournamentTitle, organizationName, tournamentDate, time, location, organizerContact, rules, tournamentUrl }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Rappel : {tournamentTitle ?? 'votre tournoi'} c’est demain !</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>{organizationName ?? 'Foxes Darts'}</Heading>
        <Text style={text}>{participantName ? `Bonjour ${participantName},` : 'Bonjour,'}</Text>
        <Text style={text}>Petit rappel : vous êtes inscrit au tournoi <strong>{tournamentTitle ?? ''}</strong>, qui a lieu demain.</Text>
        <Section style={box}>
          <Text style={line}><strong>Date :</strong> {tournamentDate ?? 'demain'}</Text>
          {time ? <Text style={line}><strong>Heure :</strong> {time}</Text> : null}
          {location ? <Text style={line}><strong>Lieu :</strong> {location}</Text> : null}
        </Section>
        <Text style={warn}>
          En cas d’indisponibilité, contactez l’organisateur au plus vite{organizerContact ? ` : ${organizerContact}` : ''}.
        </Text>
        {rules && rules.length ? (
          <>
            <Hr style={hr} />
            <Heading as="h2" style={h2}>Règles du tournoi</Heading>
            {rules.map((r, i) => <Text key={i} style={line}>• {r}</Text>)}
          </>
        ) : null}
        {tournamentUrl ? (
          <Section style={buttonWrap}><Button style={button} href={tournamentUrl}>Voir le tournoi</Button></Section>
        ) : null}
        <Text style={muted}>Bonne chance et à demain !</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) => `Rappel : ${data['tournamentTitle'] ?? 'votre tournoi'} c’est demain`,
  displayName: 'Rappel la veille du tournoi',
  previewData: {
    participantName: 'Patrice D. & Julie M.',
    tournamentTitle: 'Tournoi de printemps',
    organizationName: 'Foxes Darts',
    tournamentDate: 'samedi 14 mars 2026',
    time: '14h00 – 19h00',
    location: 'Salle Huchin, Saint-Léonard',
    organizerContact: 'contact@foxesdarts.com · 06 12 34 56 78',
    rules: ['Format : doublette', 'Phase de poules : 501, sortie double (5 tours d’essais de double maximum, ensuite sortie simple)', 'Phase finale : 501, sortie simple, 2 manches gagnantes'],
    tournamentUrl: 'https://foxesdarts.com/tournois/exemple',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 25px', maxWidth: '560px' }
const heading = { color: '#e85d3a', fontSize: '24px', margin: '0 0 16px' }
const h2 = { color: '#1a1a1a', fontSize: '17px', margin: '8px 0' }
const text = { color: '#1a1a1a', fontSize: '15px', lineHeight: '22px' }
const line = { color: '#1a1a1a', fontSize: '14px', lineHeight: '20px', margin: '4px 0' }
const box = { backgroundColor: '#f6f3f1', borderRadius: '8px', padding: '10px 16px', margin: '8px 0 12px' }
const warn = { color: '#b2412a', fontSize: '14px', lineHeight: '20px', fontWeight: 'bold' }
const hr = { borderColor: '#e5e0dc', margin: '18px 0 8px' }
const buttonWrap = { textAlign: 'center' as const, margin: '18px 0' }
const button = { backgroundColor: '#e85d3a', color: '#ffffff', fontSize: '15px', fontWeight: 'bold', textDecoration: 'none', padding: '12px 28px', borderRadius: '8px' }
const muted = { color: '#6b7280', fontSize: '13px', lineHeight: '19px' }
