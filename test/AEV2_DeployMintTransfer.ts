import { ethers } from "hardhat";
import { expect } from "chai";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ERC2771Forwarder, MyToken2_AE } from "../typechain-types";

describe("AE TokenV2: Deploy tokens and test batch Mint, Transfer", function () {
  let firstSigner: HardhatEthersSigner;
  let secondSigner: HardhatEthersSigner;
  let thirdSigner: HardhatEthersSigner;
  let forwarder: ERC2771Forwarder;
  let tokenContract_Fertilizer: MyToken2_AE;
  let tokenContract_Shovel: MyToken2_AE;
  let tokenContract_Seeds: MyToken2_AE;
  let tokenContract_Pesticide: MyToken2_AE;

  before(async function () {
    //firstSigner-consumer, secondSigner-store, thirdSigner-DSRV -> minting을 하며 정부 역할을 합니다.
    [firstSigner, secondSigner, thirdSigner] = await ethers.getSigners();

    const ERC2771Forwarder = await ethers.getContractFactory(
      "ERC2771Forwarder",
      thirdSigner
    );
    forwarder = await ERC2771Forwarder.deploy("TrustedForwarder");
    await forwarder.waitForDeployment();

    const ERC20Factory = await ethers.getContractFactory(
      "MyToken2_AE",
      thirdSigner
    );

    tokenContract_Fertilizer = await ERC20Factory.deploy(
      thirdSigner.address,
      await forwarder.getAddress(),
      "FERTILIZER"
    );
    await tokenContract_Fertilizer.waitForDeployment();

    tokenContract_Shovel = await ERC20Factory.deploy(
      thirdSigner.address,
      await forwarder.getAddress(),
      "SHOVEL"
    );
    await tokenContract_Shovel.waitForDeployment();

    tokenContract_Seeds = await ERC20Factory.deploy(
      thirdSigner.address,
      await forwarder.getAddress(),
      "SEEDS"
    );
    await tokenContract_Seeds.waitForDeployment();

    tokenContract_Pesticide = await ERC20Factory.deploy(
      thirdSigner.address,
      await forwarder.getAddress(),
      "PESTICIDE"
    );
    await tokenContract_Pesticide.waitForDeployment();

    console.log(
      "fertilizer token address: ",
      await tokenContract_Fertilizer.getAddress()
    );
    console.log(
      "shovel token address: ",
      await tokenContract_Shovel.getAddress()
    );
    console.log(
      "seeds token address: ",
      await tokenContract_Seeds.getAddress()
    );
    console.log(
      "pesticide token address: ",
      await tokenContract_Pesticide.getAddress()
    );
    console.log("forwarder address: ", await forwarder.getAddress());
  });

  it("Mint and Transfer Token", async function () {
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
      "Initial Balance of Fertilizer token: ",
      initialBalance_Fertilizer
    );
    console.log("Initial Balance of Shovel token: ", initialBalance_Shovel);
    console.log("Initial Balance of Seeds token: ", initialBalance_Seeds);
    console.log(
      "Initial Balance of Pesticide token: ",
      initialBalance_Pesticide
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

    // Batch mint
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const tenMinutesInSeconds = 10 * 60;
    const deadline = BigInt(nowInSeconds + tenMinutesInSeconds);

    let nonce = await forwarder.nonces(thirdSigner.address);

    const mintRequests = [];
    const tokenContracts = [
      tokenContract_Fertilizer,
      tokenContract_Shovel,
      tokenContract_Seeds,
      tokenContract_Pesticide,
    ];

    for (const tokenContract of tokenContracts) {
      const mintValue = {
        from: thirdSigner.address,
        to: await tokenContract.getAddress(),
        value: BigInt(0),
        gas: BigInt("100000"),
        nonce: nonce,
        deadline: deadline,
        data: tokenContract.interface.encodeFunctionData("mint", [
          firstSigner.address,
          ethers.parseUnits("2", 18),
        ]),
      };

      const mintSignature = await thirdSigner.signTypedData(
        domain,
        { ForwardRequest: types.ForwardRequest },
        mintValue
      );

      mintRequests.push({
        from: mintValue.from,
        to: mintValue.to,
        value: mintValue.value,
        gas: mintValue.gas,
        nonce: mintValue.nonce,
        deadline: mintValue.deadline,
        data: mintValue.data,
        signature: mintSignature,
      });

      nonce = nonce + 1n;
    }

    const executeMintBatchTx = await forwarder.executeBatch(
      mintRequests,
      thirdSigner.address
    );
    console.log("Executing Mint Batch Transaction");
    await executeMintBatchTx.wait();

    // Batch transfer
    nonce = await forwarder.nonces(firstSigner.address);

    const transferRequests = [];

    for (const tokenContract of tokenContracts) {
      const transferValue = {
        from: firstSigner.address,
        to: await tokenContract.getAddress(),
        value: BigInt(0),
        gas: BigInt("100000"),
        nonce: nonce,
        deadline: deadline,
        data: tokenContract.interface.encodeFunctionData("transfer", [
          secondSigner.address,
          ethers.parseUnits("2", 18),
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

    const executeTransferBatchTx = await forwarder.executeBatch(
      transferRequests,
      firstSigner.address
    );
    console.log("Execute Transfer Batch Transaction confirming");
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
      "Final balance of second signer's Fertilizer token: ",
      finalBalance_Fertilizer
    );
    console.log(
      "Final balance of second signer's Shovel token: ",
      finalBalance_Shovel
    );
    console.log(
      "Final balance of second signer's Seeds token: ",
      finalBalance_Seeds
    );
    console.log(
      "Final balance of second signer's Pesticide token: ",
      finalBalance_Pesticide
    );

    expect(finalBalance_Fertilizer).to.equal(
      initialBalance_Fertilizer + ethers.parseUnits("2", 18)
    );
    expect(finalBalance_Shovel).to.equal(
      initialBalance_Shovel + ethers.parseUnits("2", 18)
    );
    expect(finalBalance_Seeds).to.equal(
      initialBalance_Seeds + ethers.parseUnits("2", 18)
    );
    expect(finalBalance_Pesticide).to.equal(
      initialBalance_Pesticide + ethers.parseUnits("2", 18)
    );
  });
});
