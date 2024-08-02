import { toNano } from '@ton/core';
import { StakeWallet } from '../wrappers/StakeWallet';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const stakedJettonWallet = provider.open(StakeWallet.createFromConfig({}, await compile('StakeWallet')));

    await stakedJettonWallet.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(stakedJettonWallet.address);

    // run methods on `stakedJettonWallet`
}
