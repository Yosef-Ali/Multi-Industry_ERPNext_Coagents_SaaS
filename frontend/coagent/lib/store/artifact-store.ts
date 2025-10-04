import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
	Artifact,
	DeploymentRequest,
	GenerationContext,
	RefinementRequest,
	VariantSet,
} from '../types/artifact';

interface ArtifactState {
	// Current variant set being worked on
	currentVariantSet: VariantSet | null;

	// All variant sets in history
	variantSets: VariantSet[];

	// Selected variant (1, 2, or 3)
	selectedVariant: 1 | 2 | 3 | null;

	// Refinement history for current variant set
	refinements: RefinementRequest[];

	// Deployment requests
	deployments: DeploymentRequest[];

	// UI state
	isGenerating: boolean;
	isRefining: boolean;
	isDeploying: boolean;
	error: string | null;

	// Preview state
	previewArtifact: Artifact | null;
}

interface ArtifactActions {
	// Generation actions
	startGeneration: (context: GenerationContext) => void;
	setVariantSet: (variantSet: VariantSet) => void;
	completeGeneration: () => void;
	setGenerationError: (error: string) => void;

	// Variant selection
	selectVariant: (variant: 1 | 2 | 3) => void;

	// Refinement actions
	startRefinement: (prompt: string) => void;
	completeRefinement: (result: Artifact) => void;
	setRefinementError: (error: string) => void;

	// Deployment actions
	requestDeployment: (artifactId: string, environment: 'local' | 'staging' | 'production') => void;
	approveDeployment: (deploymentId: string, approvedBy: string) => void;
	startDeployment: (deploymentId: string) => void;
	completeDeployment: (deploymentId: string) => void;
	failDeployment: (deploymentId: string, error: string) => void;

	// Preview actions
	setPreviewArtifact: (artifact: Artifact | null) => void;

	// History actions
	clearHistory: () => void;
	loadVariantSet: (id: string) => void;
}

type ArtifactStore = ArtifactState & ArtifactActions;

export const useArtifactStore = create<ArtifactStore>()(
	immer((set, _get) => ({
		// Initial state
		currentVariantSet: null,
		variantSets: [],
		selectedVariant: null,
		refinements: [],
		deployments: [],
		isGenerating: false,
		isRefining: false,
		isDeploying: false,
		error: null,
		previewArtifact: null,

		// Generation actions
		startGeneration: (context) =>
			set((state) => {
				state.isGenerating = true;
				state.error = null;
				state.currentVariantSet = {
					id: `vs-${Date.now()}`,
					context,
					variants: [] as any, // Will be filled when generation completes
					refinements: [],
				};
			}),

		setVariantSet: (variantSet) =>
			set((state) => {
				state.currentVariantSet = variantSet;
				state.variantSets.push(variantSet);
				state.isGenerating = false;
				// Auto-select variant 2 (balanced) by default
				state.selectedVariant = 2;
				state.previewArtifact = variantSet.variants[1];
			}),

		completeGeneration: () =>
			set((state) => {
				state.isGenerating = false;
			}),

		setGenerationError: (error) =>
			set((state) => {
				state.isGenerating = false;
				state.error = error;
			}),

		// Variant selection
		selectVariant: (variant) =>
			set((state) => {
				state.selectedVariant = variant;
				if (state.currentVariantSet) {
					state.previewArtifact = state.currentVariantSet.variants[variant - 1];
				}
			}),

		// Refinement actions
		startRefinement: (prompt) =>
			set((state) => {
				state.isRefining = true;
				state.error = null;

				if (state.currentVariantSet && state.selectedVariant) {
					const selectedArtifact = state.currentVariantSet.variants[state.selectedVariant - 1];

					const refinement: RefinementRequest = {
						id: `ref-${Date.now()}`,
						variantId: selectedArtifact.id,
						prompt,
						timestamp: new Date(),
					};

					state.refinements.push(refinement);
					state.currentVariantSet.refinements.push(refinement);
				}
			}),

		completeRefinement: (result) =>
			set((state) => {
				state.isRefining = false;

				if (state.refinements.length > 0) {
					const lastRefinement = state.refinements[state.refinements.length - 1];
					lastRefinement.result = result;
				}

				if (state.currentVariantSet && state.selectedVariant) {
					// Update the variant with refined result
					state.currentVariantSet.variants[state.selectedVariant - 1] = result;
					state.previewArtifact = result;
				}
			}),

		setRefinementError: (error) =>
			set((state) => {
				state.isRefining = false;
				state.error = error;
			}),

		// Deployment actions
		requestDeployment: (artifactId, environment) =>
			set((state) => {
				const deployment: DeploymentRequest = {
					id: `dep-${Date.now()}`,
					artifactId,
					targetEnvironment: environment,
					status: 'pending_approval',
				};
				state.deployments.push(deployment);
			}),

		approveDeployment: (deploymentId, approvedBy) =>
			set((state) => {
				const deployment = state.deployments.find((d) => d.id === deploymentId);
				if (deployment) {
					deployment.status = 'approved';
					deployment.approvedBy = approvedBy;
					deployment.approvedAt = new Date();
				}
			}),

		startDeployment: (deploymentId) =>
			set((state) => {
				state.isDeploying = true;
				const deployment = state.deployments.find((d) => d.id === deploymentId);
				if (deployment) {
					deployment.status = 'deploying';
				}
			}),

		completeDeployment: (deploymentId) =>
			set((state) => {
				state.isDeploying = false;
				const deployment = state.deployments.find((d) => d.id === deploymentId);
				if (deployment) {
					deployment.status = 'deployed';
					deployment.deployedAt = new Date();
				}
			}),

		failDeployment: (deploymentId, error) =>
			set((state) => {
				state.isDeploying = false;
				const deployment = state.deployments.find((d) => d.id === deploymentId);
				if (deployment) {
					deployment.status = 'failed';
					deployment.error = error;
				}
			}),

		// Preview actions
		setPreviewArtifact: (artifact) =>
			set((state) => {
				state.previewArtifact = artifact;
			}),

		// History actions
		clearHistory: () =>
			set((state) => {
				state.variantSets = [];
				state.currentVariantSet = null;
				state.selectedVariant = null;
				state.refinements = [];
				state.deployments = [];
				state.previewArtifact = null;
			}),

		loadVariantSet: (id) =>
			set((state) => {
				const variantSet = state.variantSets.find((vs) => vs.id === id);
				if (variantSet) {
					state.currentVariantSet = variantSet;
					state.refinements = variantSet.refinements;
					state.selectedVariant = variantSet.selectedVariant || 2;
					state.previewArtifact = variantSet.variants[(variantSet.selectedVariant || 2) - 1];
				}
			}),
	}))
);
