import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Locator } from '@playwright/test';

export interface ContractColumn {
	key: string;
	label: string;
	testid: string;
}

export interface ContractRow {
	code: string;
	name?: string;
	testid: string;
}

export interface ContractLink {
	text: string;
	href: string;
	testid: string;
}

export interface ContractCard {
	label: string;
	testid: string;
}

export interface TableContract {
	route: string;
	tier: string;
	table_testid: string;
	columns: ContractColumn[];
	min_rows?: number;
	contract_version: string;
}

const contractsDir = resolve(process.cwd(), 'tests', 'contracts');

export function loadContract<T>(fileName: string): T {
	return JSON.parse(readFileSync(resolve(contractsDir, fileName), 'utf8')) as T;
}

export function getColumnIndex(columns: ContractColumn[], key: string): number {
	const index = columns.findIndex((column) => column.key === key);
	if (index === -1) {
		throw new Error(`Missing contract column: ${key}`);
	}
	return index;
}

export async function getCellText(row: Locator, columns: ContractColumn[], key: string): Promise<string> {
	const cell = row.locator('td').nth(getColumnIndex(columns, key));
	return normalizeText(await cell.textContent());
}

export function normalizeText(value: string | null | undefined): string {
	return (value || '').replace(/\s+/g, ' ').trim();
}
