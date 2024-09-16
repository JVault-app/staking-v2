import { NetworkProvider } from "@ton/blueprint";
import { Address } from "@ton/ton";


export async function lastBlockSeqno(provider: NetworkProvider) {
    return (await provider.api().getLastBlock()).last.seqno;
}

export async function getSeqno(provider: NetworkProvider) {
    // try {
    return (await provider.api().runMethod(await lastBlockSeqno(provider), provider.sender().address!!, 'seqno')).reader.readNumber()
    // }
    // catch {
    //     return 0
    // }
}