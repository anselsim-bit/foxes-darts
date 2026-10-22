import React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  participantName?: string
  tournamentTitle?: string
  tournamentDate?: string
  playUrl?: string
}

const Email = ({ participantName, tournamentTitle, tournamentDate, playUrl }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre accès au tournoi {tournamentTitle ?? 'Foxes Darts'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>Foxes Darts</Heading>
        <Text style={text}>{participantName ? `Bonjour ${participantName},` : 'Bonjour,'}</Text>
        <Text style={text}>
          Vous êtes inscrit au tournoi <strong>{tournamentTitle ?? 'Foxes Darts'}</strong>
          {tournamentDate ? ` du ${tournamentDate}` : ''}. Le jour J, cliquez sur le bouton
          ci-dessous pour accéder au tournoi : saisissez le code d'accès communiqué par
          l'organisateur, choisissez votre match et enregistrez les résultats.
        </Text>
        {playUrl ? (
          <Section style={buttonWrap}>
            <Button style={button} href={playUrl}>
              Accéder au tournoi
            </Button>
          </Section>
        ) : null}
        <Text style={muted}>
          Si vous n'êtes pas à l'origine de cette
          inscription, ignorez simplement cet email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `Accès au tournoi — ${data['tournamentTitle'] ?? 'Tournoi Foxes Darts'}`,
  displayName: 'Lien d’accès tournoi',
  previewData: {
    participantName: 'Simon',
    tournamentTitle: 'Tournoi test — Doublettes',
    tournamentDate: '12/10/2026',
    playUrl: 'https://foxesdarts.com/tournois/exemple/jouer',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 25px', maxWidth: '560px' }
const heading = { color: '#e85d3a', fontSize: '24px', margin: '0 0 16px' }
const text = { color: '#1a1a1a', fontSize: '15px', lineHeight: '22px' }
const buttonWrap = { textAlign: 'center' as const, margin: '8px 0 18px' }
const button = {
  backgroundColor: '#e85d3a',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 'bold',
  textDecoration: 'none',
  padding: '12px 28px',
  borderRadius: '8px',
}
const muted = { color: '#6b7280', fontSize: '13px', lineHeight: '19px' }
