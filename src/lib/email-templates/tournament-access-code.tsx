import React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  participantName?: string
  tournamentTitle?: string
  tournamentDate?: string
  code?: string
  playUrl?: string
}

const Email = ({ participantName, tournamentTitle, tournamentDate, code, playUrl }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre code d'accès pour le tournoi {tournamentTitle ?? 'Foxes Darts'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>Foxes Darts</Heading>
        <Text style={text}>{participantName ? `Bonjour ${participantName},` : 'Bonjour,'}</Text>
        <Text style={text}>
          Le tournoi <strong>{tournamentTitle ?? 'Foxes Darts'}</strong>
          {tournamentDate ? ` du ${tournamentDate}` : ''} est complet ! Voici votre code d'accès
          personnel pour le jour J.
        </Text>
        <Section style={codeBox}>
          <Text style={codeText}>{code ?? '------'}</Text>
        </Section>
        <Text style={text}>
          Le jour du tournoi, une fois les codes activés par l'organisateur, cliquez sur le
          bouton ci-dessous, saisissez votre code, puis choisissez votre match pour enregistrer
          les résultats. Le tableau du tournoi se mettra à jour automatiquement.
        </Text>
        {playUrl ? (
          <Section style={buttonWrap}>
            <Button style={button} href={playUrl}>
              Accéder au tournoi
            </Button>
          </Section>
        ) : null}
        <Text style={muted}>
          Ce code est personnel : ne le partagez pas. Si vous n'êtes pas à l'origine de cette
          inscription, ignorez simplement cet email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `Votre code d'accès — ${data['tournamentTitle'] ?? 'Tournoi Foxes Darts'}`,
  displayName: 'Code d’accès tournoi',
  previewData: {
    participantName: 'Simon',
    tournamentTitle: 'Tournoi test — Doublettes',
    tournamentDate: '12/10/2026',
    code: 'K7P2XQ',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 25px', maxWidth: '560px' }
const heading = { color: '#e85d3a', fontSize: '24px', margin: '0 0 16px' }
const text = { color: '#1a1a1a', fontSize: '15px', lineHeight: '22px' }
const codeBox = {
  backgroundColor: '#1a1a1a',
  borderRadius: '8px',
  textAlign: 'center' as const,
  padding: '18px',
  margin: '18px 0',
}
const codeText = {
  color: '#e85d3a',
  fontSize: '32px',
  fontWeight: 'bold',
  letterSpacing: '6px',
  margin: '0',
}
const muted = { color: '#6b7280', fontSize: '13px', lineHeight: '19px' }
