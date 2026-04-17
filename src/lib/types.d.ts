export interface RadialLayoutOptions {
	nodes: Node[];
	links: Link[];
	width: number;
	height: number;
}

export type Node = {
	id: string;
	x: number;
	y: number;
	shape?: string;
	infected?: boolean;
	highlight?: boolean;
	label?: string;
	group?: number;
	vbet?: number;
};

export type RawLink = {
	source: string;
	target: string;
	value: number;
};

export type SimulatedLink = {
	source: Node;
	target: Node;
	value: number;
	index?: number;
	highlight?: boolean;
};

export type Link = RawLink | SimulatedLink;
