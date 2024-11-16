import { Address, beginCell, Cell } from "@ton/core";

export function packStateInit(code: Cell, data: Cell): Cell {
    return beginCell()
        .storeUint(0, 2)
        .storeMaybeRef(code)
        .storeMaybeRef(data)
        .storeUint(0, 1)
    .endCell();
}

export function getAddressByStateInit(stateInit: Cell): Address {
    return beginCell()
                .storeUint(1024, 11)
                .storeUint(BigInt('0x' + stateInit.hash().toString('hex')), 256)
            .endCell().beginParse().loadAddress();
}
