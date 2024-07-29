// import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
// import { Cell, toNano } from '@ton/core';
// import { StakedJettonWallet } from '../wrappers/StakedJettonWallet';
// import '@ton/test-utils';
// import { compile } from '@ton/blueprint';

// describe('StakedJettonWallet', () => {
//     let code: Cell;

//     beforeAll(async () => {
//         code = await compile('StakedJettonWallet');
//     });

//     let blockchain: Blockchain;
//     let deployer: SandboxContract<TreasuryContract>;
//     let stakedJettonWallet: SandboxContract<StakedJettonWallet>;

//     beforeEach(async () => {
//         blockchain = await Blockchain.create();

//         stakedJettonWallet = blockchain.openContract(StakedJettonWallet.createFromConfig({}, code));

//         deployer = await blockchain.treasury('deployer');

//         const deployResult = await stakedJettonWallet.sendDeploy(deployer.getSender(), toNano('0.05'));

//         expect(deployResult.transactions).toHaveTransaction({
//             from: deployer.address,
//             to: stakedJettonWallet.address,
//             deploy: true,
//             success: true,
//         });
//     });

//     it('should deploy', async () => {
//         // the check is done inside beforeEach
//         // blockchain and stakedJettonWallet are ready to use
//     });
// });
