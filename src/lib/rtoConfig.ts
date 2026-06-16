export interface RTOConfig {
  id: string;
  name: string;
  shortName: string;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  passcode?: string;
  logoUrl?: string;
  infoText?: string;
  domain?: string;
}

export const RTOS: RTOConfig[] = [
  {
    id: 'aibt',
    name: 'AIBT',
    shortName: 'AIBT',
    primaryColor: '#34A853', // Green
    secondaryColor: '#f0fdf4',
    textColor: '#ffffff',
    passcode: 'GR6BDY27A',
    logoUrl: 'https://storage.googleapis.com/stateless-my-aibt-global/2022/04/a8a80625-aibt_landscape-01.svg',
    domain: 'aibtglobal.edu.au',
  },
  {
    id: 'reach',
    name: 'Reach',
    shortName: 'Reach',
    primaryColor: '#f97316', // Orange
    secondaryColor: '#fff7ed',
    textColor: '#ffffff',
    passcode: 'Z8JJOBERXS',
    logoUrl: 'https://storage.googleapis.com/stateless-my-aibt-global/2022/01/3b60fb6b-reach-logo-card.png',
    domain: 'reachcollege.edu.au',
  },
  {
    id: 'avta',
    name: 'AVTA',
    shortName: 'AVTA',
    primaryColor: '#1e40af', // Blue
    secondaryColor: '#eff6ff',
    textColor: '#ffffff',
    passcode: '6A2ADLI47L',
    logoUrl: 'https://storage.googleapis.com/stateless-my-aibt-global/2023/09/b997a2e8-avta-abrev-landscape-01.svg',
    domain: 'avta.edu.au',
  },
  {
    id: 'npa',
    name: 'NPA',
    shortName: 'NPA',
    primaryColor: '#ef4444', // Red
    secondaryColor: '#fef2f2',
    textColor: '#ffffff',
    passcode: 'BCZIR08NUN',
    logoUrl: 'https://storage.googleapis.com/stateless-my-aibt-global/2023/02/7eaa072c-npa-logo_landscape-small.svg',
    domain: 'npa.edu.au',
  },
  {
    id: 'aibt_i',
    name: 'AIBT-I',
    shortName: 'AIBT-I',
    primaryColor: '#34A853', // Green
    secondaryColor: '#f0fdf4',
    textColor: '#ffffff',
    passcode: '5DM7OD5TXN',
    logoUrl: 'https://storage.googleapis.com/stateless-my-aibt-global/2023/09/b335283d-aibt-i-landscape-01.svg',
    domain: 'aibtglobal.edu.au',
  },
  {
    id: 'pivot',
    name: 'Pivot Education',
    shortName: 'Pivot',
    primaryColor: '#8b5cf6', // Violet
    secondaryColor: '#f5f3ff',
    textColor: '#ffffff',
    passcode: '7GFZK3J8IJ', // Also provided: H8H0NR7HPZ
    logoUrl: 'https://storage.googleapis.com/stateless-my-aibt-global/2025/08/ddbfbc81-pivot-landscape-logo-01-1024x219.png',
    domain: 'pivot.edu.au',
  },
  {
    id: 'hj',
    name: 'HJ Australian Institute',
    shortName: 'HJ',
    primaryColor: '#ffffff',
    secondaryColor: '#f0f4f8',
    textColor: '#040404',
    passcode: '8PEVYY3C7F',
    logoUrl: 'https://hjaustralianinstitute.edu.au/wp-content/uploads/2025/10/HJ-Landscape-Logo-01-1.svg',
    infoText: 'This card remains the property of HJ Australian Institute. We reserve the right to revoke this card at any time.\n\nCRICOS Code: 04390D -  RTO Code: 46466 - ABN 66 668 379 333\n\nCONTACT US\n+61 2 8609 6674\ninfo@hjaustralianinstitute.edu.au',
    domain: 'hjaustralianinstitute.edu.au',
  },
  {
    id: 'brooklyn',
    name: 'Brooklyn Internation college',
    shortName: 'Brooklyn',
    primaryColor: '#0ea5e9', // Sky
    secondaryColor: '#f0f9ff',
    textColor: '#ffffff',
    passcode: '544B574Z14',
    logoUrl: 'https://storage.googleapis.com/stateless-my-aibt-global/2025/05/34d904bb-bic-landscape-logo-colour.svg',
    domain: 'brooklyn.edu.au',
  },
];
