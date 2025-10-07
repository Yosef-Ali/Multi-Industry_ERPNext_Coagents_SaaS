import { motion } from 'framer-motion';
import { SuggestedPrompts } from '@/components/developer/suggested-prompts';

export const Greeting = () => {
	return (
		<div
			className="mx-auto mt-4 flex size-full max-w-3xl flex-col justify-center px-4 md:mt-16 md:px-8"
			key="overview"
		>
			<motion.div
				animate={{ opacity: 1, y: 0 }}
				className="font-semibold text-xl md:text-2xl"
				exit={{ opacity: 0, y: 10 }}
				initial={{ opacity: 0, y: 10 }}
				transition={{ delay: 0.5 }}
			>
				Welcome to the ERPNext Developer Copilot.
			</motion.div>
			<motion.div
				animate={{ opacity: 1, y: 0 }}
				className="text-xl text-zinc-500 md:text-2xl"
				exit={{ opacity: 0, y: 10 }}
				initial={{ opacity: 0, y: 10 }}
				transition={{ delay: 0.6 }}
			>
				Ask for DocType scaffolds, workflow automations, or ERPNext customization help.
			</motion.div>
			<SuggestedPrompts />
		</div>
	);
};
