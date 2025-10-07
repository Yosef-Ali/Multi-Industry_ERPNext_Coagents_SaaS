'use client';

import { motion } from 'framer-motion';
import { memo } from 'react';
import { persistChatIdInUrl } from '@/lib/utils';
import { Suggestion } from './elements/suggestion';
import type { VisibilityType } from './visibility-selector';

type SuggestedActionsProps = {
	chatId: string;
	onSelect: (suggestion: string) => void;
	selectedVisibilityType: VisibilityType;
};

function PureSuggestedActions({ chatId, onSelect }: SuggestedActionsProps) {
	const suggestedActions = [
		'Set up a DocType for Sales Order approvals with custom states and permissions.',
		'Write a client script to block submission when an Item is out of stock.',
		'Build a query report showing monthly revenue by customer territory.',
		'Outline the steps to add a custom module to the ERPNext desk sidebar.',
	];

	return (
		<div className="grid w-full gap-2 sm:grid-cols-2" data-testid="suggested-actions">
			{suggestedActions.map((suggestedAction, index) => (
				<motion.div
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: 20 }}
					initial={{ opacity: 0, y: 20 }}
					key={suggestedAction}
					transition={{ delay: 0.05 * index }}
				>
					<Suggestion
						className="h-auto w-full whitespace-normal p-3 text-left"
						onClick={(suggestion) => {
							persistChatIdInUrl(chatId);
							onSelect(suggestion);
						}}
						suggestion={suggestedAction}
					>
						{suggestedAction}
					</Suggestion>
				</motion.div>
			))}
		</div>
	);
}

export const SuggestedActions = memo(PureSuggestedActions, (prevProps, nextProps) => {
	if (prevProps.chatId !== nextProps.chatId) {
		return false;
	}
	if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType) {
		return false;
	}

	return true;
});
