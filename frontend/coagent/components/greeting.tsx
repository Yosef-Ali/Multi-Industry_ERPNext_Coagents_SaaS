import { motion } from 'framer-motion';
import { SuggestedPrompts } from '@/components/developer/suggested-prompts';

export const Greeting = () => {
	return (
		<div className="mx-auto w-full max-w-3xl space-y-5 px-4 pb-8 pt-12 md:px-8" key="overview">
			<motion.div
				animate={{ opacity: 1, y: 0 }}
				className="text-center md:text-left"
				exit={{ opacity: 0, y: 6 }}
				initial={{ opacity: 0, y: 6 }}
				transition={{ delay: 0.25 }}
			>
				<h1 className="text-3xl font-semibold md:text-4xl">ERPNext Developer Copilot</h1>
			</motion.div>

			<motion.div
				animate={{ opacity: 1, y: 0 }}
				className="space-y-3"
				exit={{ opacity: 0, y: 6 }}
				initial={{ opacity: 0, y: 6 }}
				transition={{ delay: 0.35 }}
			>
				<SuggestedPrompts />
			</motion.div>
		</div>
	);
};
