import { CompilerConfig } from '@ton/blueprint';

export const compile: CompilerConfig = {
    lang: 'func',
    targets: ['contracts/other/staking_pool_uninited.fc'],
};
