import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const jobRoles = [
    {
      title: 'Senior NestJS Backend Engineer',
      department: 'Engineering',
      summary: 'Design and maintain scalable NestJS microservices with strong TypeScript practices.',
      requirements: `
- 5+ years of backend experience with Node.js and NestJS
- Experience with PostgreSQL and Prisma ORM
- Knowledge of cloud infrastructure (AWS/GCP) and CI/CD pipelines
- Background in building secure REST APIs and integrating with third-party services
      `.trim(),
      isActive: true,
    },
    {
      title: 'AI Automation Specialist',
      department: 'Innovation Lab',
      summary: 'Automate business workflows using low-code tools and LLM integrations.',
      requirements: `
- Hands-on n8n or similar automation platform experience
- Ability to design LLM prompts and safeguard workflows from prompt injection
- Familiarity with Google Gemini or OpenAI models
- Strong communication and documentation habits
      `.trim(),
      isActive: true,
    },
    {
      title: 'Technical Program Manager',
      department: 'Operations',
      summary: 'Coordinate cross-functional teams delivering AI-powered automation initiatives.',
      requirements: `
- Proven track record managing technical programs with agile methodologies
- Experience translating business requirements into technical deliverables
- Understanding of resume screening and talent operations processes
- Excellent stakeholder communication and risk management skills
      `.trim(),
      isActive: true,
    },
  ];

  for (const jobRole of jobRoles) {
    await prisma.jobRole.upsert({
      where: { title: jobRole.title },
      create: jobRole,
      update: jobRole,
    });
  }
}

main()
  .catch((error) => {
    console.error('Failed to seed database', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
