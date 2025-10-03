'use client';

import { CopilotChat } from '@copilotkit/react-ui';
import '@copilotkit/react-ui/styles.css';

export default function DeveloperPage() {
  return (
    <div className="h-full flex flex-col">
      <CopilotChat
        className="h-full"
        instructions="You are an ERPNext development assistant. Help users generate DocTypes, Workflows, and ERPNext applications. Always generate 3 variants for each request with different complexity levels."
        labels={{
          title: 'ERPNext Developer',
          initial:
            'Hi! I can help you build ERPNext applications. Describe what you want to create, and I\'ll generate 3 variants for you to choose from.',
        }}
      />
    </div>
  );
}
