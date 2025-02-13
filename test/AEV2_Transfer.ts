import { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ERC2771Forwarder, MyToken2_AE } from "../typechain-types";
import { expect } from "chai";

describe("TokenV2_AE: Token Transfer Test", function () {
  let firstSigner: HardhatEthersSigner;
  let secondSigner: HardhatEthersSigner;
  let thirdSigner: HardhatEthersSigner;
  let forwarder: ERC2771Forwarder;
  let tokenContract_Fertilizer: MyToken2_AE;
  let tokenContract_Shovel: MyToken2_AE;
  let tokenContract_Seeds: MyToken2_AE;
  let tokenContract_Pesticide: MyToken2_AE;

  beforeEach(async function () {
    [firstSigner, secondSigner, thirdSigner] = await ethers.getSigners();

    // Replace with your token contract addresses
    const tokenAddresses = {
      fertilizer: "0x390a82350f94529CDCbC312E9Dfe84Fb60e723A2",
      shovel: "0xb50e94e087209CdD505E0D1fb7e1BDbf140De733",
      seeds: "0xACb4f7C4873af68F8880f3864678eDe937E8B724",
      pesticide: "0x4CFF1f2Ce4e05ca15e8ec3d4F85456b63fD4eF8E",
    };

    tokenContract_Fertilizer = (await ethers.getContractAt(
      "MyToken2_AE",
      tokenAddresses.fertilizer
    )) as MyToken2_AE;
    tokenContract_Shovel = (await ethers.getContractAt(
      "MyToken2_AE",
      tokenAddresses.shovel
    )) as MyToken2_AE;
    tokenContract_Seeds = (await ethers.getContractAt(
      "MyToken2_AE",
      tokenAddresses.seeds
    )) as MyToken2_AE;
    tokenContract_Pesticide = (await ethers.getContractAt(
      "MyToken2_AE",
      tokenAddresses.pesticide
    )) as MyToken2_AE;

    forwarder = (await ethers.getContractAt(
      "ERC2771Forwarder",
      "0x5450fc85A67c340f6C8c3743184c2bAb9e30F96c"
    )) as ERC2771Forwarder;
  });

  it("transfer", async function () {
    const initialBalance_Fertilizer = await tokenContract_Fertilizer.balanceOf(
      secondSigner.address
    );
    const initialBalance_Shovel = await tokenContract_Shovel.balanceOf(
      secondSigner.address
    );
    const initialBalance_Seeds = await tokenContract_Seeds.balanceOf(
      secondSigner.address
    );
    const initialBalance_Pesticide = await tokenContract_Pesticide.balanceOf(
      secondSigner.address
    );

    console.log(
      "Fertilizer initial balance: ",
      ethers.formatUnits(initialBalance_Fertilizer, 18)
    );
    console.log(
      "Shovel initial balance: ",
      ethers.formatUnits(initialBalance_Shovel, 18)
    );
    console.log(
      "Seeds initial balance: ",
      ethers.formatUnits(initialBalance_Seeds, 18)
    );
    console.log(
      "Pesticide initial balance: ",
      ethers.formatUnits(initialBalance_Pesticide, 18)
    );

    const domain = {
      name: "TrustedForwarder",
      version: "1",
      chainId: (await thirdSigner.provider.getNetwork()).chainId,
      verifyingContract: await forwarder.getAddress(),
    };

    const types = {
      ForwardRequest: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "gas", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint48" },
        { name: "data", type: "bytes" },
      ],
    };

    const nowInSeconds = Math.floor(Date.now() / 1000);
    const tenMinutesInSeconds = 10 * 60;
    const deadline = BigInt(nowInSeconds + tenMinutesInSeconds);

    let nonce = await forwarder.nonces(firstSigner.address);

    const tokenContracts = [
      tokenContract_Fertilizer,
      tokenContract_Shovel,
      tokenContract_Seeds,
      tokenContract_Pesticide,
    ];

    const transferRequests = [];

    for (const tokenContract of tokenContracts) {
      const transferValue = {
        from: firstSigner.address,
        to: await tokenContract.getAddress(),
        value: BigInt(0),
        gas: BigInt(100000),
        nonce: nonce,
        deadline: deadline,
        data: tokenContract.interface.encodeFunctionData("transfer", [
          secondSigner.address,
          ethers.parseUnits("1", 18),
        ]),
      };

      const transferSignature = await firstSigner.signTypedData(
        domain,
        { ForwardRequest: types.ForwardRequest },
        transferValue
      );

      transferRequests.push({
        from: transferValue.from,
        to: transferValue.to,
        value: transferValue.value,
        gas: transferValue.gas,
        nonce: transferValue.nonce,
        deadline: transferValue.deadline,
        data: transferValue.data,
        signature: transferSignature,
      });

      nonce = nonce + 1n;
    }

    const executeTransferBatchTx = await forwarder
      .connect(thirdSigner)
      .executeBatch(transferRequests, thirdSigner.address);
    console.log("Executing Transfer Batch Transfer");
    await executeTransferBatchTx.wait();

    const finalBalance_Fertilizer = await tokenContract_Fertilizer.balanceOf(
      secondSigner.address
    );
    const finalBalance_Shovel = await tokenContract_Shovel.balanceOf(
      secondSigner.address
    );
    const finalBalance_Seeds = await tokenContract_Seeds.balanceOf(
      secondSigner.address
    );
    const finalBalance_Pesticide = await tokenContract_Pesticide.balanceOf(
      secondSigner.address
    );

    console.log(
      "Fertilizer final balance: ",
      ethers.formatUnits(finalBalance_Fertilizer, 18)
    );
    console.log(
      "Shovel final balance: ",
      ethers.formatUnits(finalBalance_Shovel, 18)
    );
    console.log(
      "Seeds final balance: ",
      ethers.formatUnits(finalBalance_Seeds, 18)
    );
    console.log(
      "Pesticide final balance: ",
      ethers.formatUnits(finalBalance_Pesticide, 18)
    );

    expect(finalBalance_Fertilizer).to.equal(
      initialBalance_Fertilizer + ethers.parseUnits("1", 18)
    );
    expect(finalBalance_Shovel).to.equal(
      initialBalance_Shovel + ethers.parseUnits("1", 18)
    );
    expect(finalBalance_Seeds).to.equal(
      initialBalance_Seeds + ethers.parseUnits("1", 18)
    );
    expect(finalBalance_Pesticide).to.equal(
      initialBalance_Pesticide + ethers.parseUnits("1", 18)
    );
  });
});
