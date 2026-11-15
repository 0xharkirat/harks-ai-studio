# EagleEye: marketing brief

Checked on 2026-11-15.
Each fact has its source.

## The product

EagleEye scans a team's Microsoft 365 email and its GitHub issues and pull requests.
An AI tags each item, and EagleEye shows the results in reports, webhooks and an MCP server.
Source: ssweagleeye.com/about, ssweagleeye.com/docs, `SSW.EagleEye/README.md`.

- Input: the mailboxes of 1 Entra group (Microsoft Graph), and the issues, PRs and comments of a GitHub org. A scan runs each night.
- Tags: Non-AI rules, AI, and AI @Mentions (it finds the people that an email names).
- Output: the Email report, the GitHub Issues and PR reports, a SQL database, and webhooks to Teams, Planner, Slack, Power Automate or Zapier.
- MCP: read-only and off by default. It has 11 tools, such as `email_top_mentioned` and `github_issues_overview`. Claude Code, Claude Desktop, VS Code and Copilot can connect. The site roadmap says "in progress". Hark said to keep the agent line (2026-11-15).
- Privacy: the Azure Marketplace install creates SQL, Key Vault, Container Apps and Azure OpenAI in the customer's own tenant (`infra/solution-template/createUiDefinition.json`). The data and the model stay in the customer's Azure subscription.

## The angle (Hark, 2026-11-15)

Email and GitHub across the whole org, for organisations and agentic development.
EagleEye is not one more wrapper around a GitHub MCP or CLI.
It lives in the company's own Azure tenant.

## Messages

| use | exact string | source |
|---|---|---|
| home h1 | "Transform Company Emails Into Data Insights" | ssweagleeye.com |
| page title | "EagleEye – AI-Powered Insights to Boost Development Productivity" | ssweagleeye.com |
| roadmap | "Ask Claude or GitHub Copilot about your EagleEye data directly" | ssweagleeye.com/roadmap |
| pricing | "Free public beta", all features, until 1 July 2027 | ssweagleeye.com/pricing |
| demo CTA | "TRY THE DEMO" → demo.ssweagleeye.com | ssweagleeye.com |

## Claims

The film may say:
- It scans email and GitHub, and an AI tags it.
- It runs in your own Azure.
- It is free in public beta.
- An AI agent can ask it questions (MCP).

The film must not say:
- Any customer count, logo or quote. SSW is the only customer today.
- SOC 2, GDPR or any other certification.
- That Azure DevOps or Teams are sources. Teams is a webhook target only.

## Brand

| item | value | source |
|---|---|---|
| accent | SSW red `#CC4141` | site CSS `--color-ssw-red`; portal `brand.primary` |
| dark world | `#222222` body, `#1F1F1F` and `#141414` panels | site CSS `802e537ca03e355a.css` |
| gradient | `#CC4141`, `#D699FB`, `#FF778E` | site CSS `--gradient-pink` |
| blue | `#0078D4` | portal `brand.outlook` |
| neutrals | shadcn zinc | portal `globals.css` |
| font | Inter 400, 600, 700 | site CSS `d775d40ba523dd50.css` (Next.js self-hosted) |
| code font | IBM Plex Mono | the site serves no mono font |
| logo | `< eye >` mark + "EagleEye", red `#CC4141` and `#333333` (white on dark) | `SSW.EagleEye.Portal/public/logo*.svg`; site `Logo.svg` |
| mascot | none; the eye mark takes the mascot's job | site and repo |

There is no media kit or style guide page.
The docs link to the SSW Design System (design.ssw.com.au).

## Demo

- demo.ssweagleeye.com is the portal built with `EAGLEEYE_DEMO=1` (`.github/workflows/release-demo.yml`).
- Its data is the made-up company "Northwind Traders". The visitor signs in as "Bob Northwind" automatically.
- The plates come from a local run of this demo build.

## Ad rules

- Google ABCD: the brand inside 5 s, 1 call to action. The film has no voice, so the sonic logo is the audio brand.
- 16:9 master for YouTube, LinkedIn and Meta. Title-safe margin 6%.
- SSW rule "use audio cues to get audience attention": a sound on each pop-up and each milestone click.
