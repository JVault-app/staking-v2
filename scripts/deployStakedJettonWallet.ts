import { toNano } from '@ton/core';
import { StakedJettonWallet } from '../wrappers/StakedJettonWallet';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const stakedJettonWallet = provider.open(StakedJettonWallet.createFromConfig({}, await compile('StakedJettonWallet')));

    await stakedJettonWallet.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(stakedJettonWallet.address);

    // run methods on `stakedJettonWallet`
}
