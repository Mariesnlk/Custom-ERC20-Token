const { assert } = require('chai')

const CustomERC20 = artifacts.require('./CustomERC20');

var chai = require("chai");
const expect = chai.expect;

const { expectRevert } = require("@openzeppelin/test-helpers");

const BN = web3.utils.BN;
const chaiBN = require('chai-bn')(BN);
chai.use(chaiBN);

var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
module.exports = chai;

contract('CustomERC20', (accounts) => {

    const [initialHolder, beneficiary1, beneficiary2, beneficiary3, beneficiary4, beneficiary5,  nonbeneficiary] = accounts;

    let contract;

    beforeEach(async () => {
        contract = await CustomERC20.deployed()
    })

    describe('deployment', async () => {
        //test contaract deployment
        it('deploys successfuly', async () => {
            const address = contract.address;
            assert.notEqual(address, '');
            assert.notEqual(address, null);
            assert.notEqual(address, undefined);
            assert.notEqual(address, 0x0);
        });

        //test name of contract
        it('name matches on contract', async () => {
            const getName = await contract.name();
            assert.equal(getName, 'Custom Token');
        });

        //test symbol of contract
        it('symbol matches on contract', async () => {
            const getSymbol = await contract.symbol();
            assert.equal(getSymbol, 'CSTMN');
        });

        //test total supply of contract
        it('totalSupply matches on contract', async () => {
            await expect(contract.totalSupply()).to.eventually.be.a.bignumber.equal(new BN(1000));
        });

        //test the owner of contract
        it('the owner is initialHolder', async () => {
            await expect(contract.owner()).to.eventually.equal(initialHolder);
        });

    });

    describe('deposit custom token', async () => {
        it('check initialHolder balance', async () => {
            await expect(contract.balanceOf(initialHolder)).to.eventually.be.a.bignumber.equal(new BN(1000));
        });

        it('only owner(initialHolder) can deposit tokens', async () => {
            await expectRevert(
                contract.deposit(new BN(100), { from: beneficiary1 }),
                "Ownable: caller is not the owner"
            );
        });

        it('deposit some tokens from initialHolder address to CustomToken contract', async () => {
            await expect(contract.deposit(new BN(100))).to.eventually.be.fulfilled;
            await expect(contract.balanceOf(initialHolder)).to.eventually.be.a.bignumber.equal(new BN(900));
            await expect(contract.balanceOf(contract.address)).to.eventually.be.a.bignumber.equal(new BN(100));
        });

        it('deposit more tokens than exisits in initialHolder address to CustomToken contract', async () => {
            await expectRevert(
                contract.deposit(new BN(9999)),
                "Not enough funds"
            );
            await expect(contract.balanceOf(initialHolder)).to.eventually.be.a.bignumber.equal(new BN(900));
            await expect(contract.balanceOf(contract.address)).to.eventually.be.a.bignumber.equal(new BN(100));
        });

    });

    describe('beneficiaries', async () => {

        it('only owner(initialHolder) can add a beneficiary', async () => {
            await expectRevert(
                contract.addBeneficiary(beneficiary1, new BN(10), { from: beneficiary2 }),
                "Ownable: caller is not the owner"
            );
        });

        it('add beneficiary', async () => {
            await expect(contract.addBeneficiary(beneficiary1, new BN(10))).to.eventually.be.fulfilled;
            let _beneficiary1 = await contract.beneficiaries.call(beneficiary1);
            expect(_beneficiary1[0]).to.be.a.bignumber.equal(new BN(10));
            expect(_beneficiary1[1]).to.equal(false);
        });

        it('only owner(initialHolder) can add a few beneficiaries', async () => {
            await expectRevert(
                contract.addBeneficiaries([beneficiary2, beneficiary3], [new BN(10), new BN(10)], { from: beneficiary4 }),
                "Ownable: caller is not the owner"
            );
        });

        it('beneficiaries array should be equal reward array', async () => {
            await expectRevert(
                contract.addBeneficiaries([beneficiary2, beneficiary3, beneficiary4], [new BN(10), new BN(10)]),
                "The length of two arrays is not equal"
            );
        });

        it('one of two arrays length cannot be zero', async () => {
            await expectRevert(
                contract.addBeneficiaries([], [new BN(10), new BN(10)]),
                "The length of two arrays is not equal"
            );
        });

        it('add two beneficiaries', async () => {
            await expect(contract.addBeneficiaries([beneficiary2, beneficiary3], [new BN(20), new BN(20)])).to.eventually.be.fulfilled;
            let _beneficiary2 = await contract.beneficiaries.call(beneficiary2);
            expect(_beneficiary2[0]).to.be.a.bignumber.equal(new BN(20));
            expect(_beneficiary2[1]).to.equal(false);
            let _beneficiary3 = await contract.beneficiaries.call(beneficiary3);
            expect(_beneficiary3[0]).to.be.a.bignumber.equal(new BN(20));
            expect(_beneficiary3[1]).to.equal(false);
        });

        it('the beneficiary cannot be added second time', async () => {
            await expect(contract.addBeneficiary(beneficiary4, new BN(15))).to.eventually.be.fulfilled;
            let _beneficiary4 = await contract.beneficiaries.call(beneficiary4);
            expect(_beneficiary4[0]).to.be.a.bignumber.equal(new BN(15));
            expect(_beneficiary4[1]).to.equal(false);
            await expectRevert(
                contract.addBeneficiary(beneficiary4, new BN(5)),
                "Beneficiary is already added"
            );
            let _updatedBeneficiary4 = await contract.beneficiaries.call(beneficiary4);
            expect(_updatedBeneficiary4[0]).to.be.a.bignumber.equal(new BN(15));
        });


    });

    describe('decrease reward', async () => {
        it('only owner(initialHolder) can decrease the reward', async () => {
            await expectRevert(
                contract.decreaseReward(beneficiary1, new BN(2), { from: beneficiary2 }),
                "Ownable: caller is not the owner"
            );
        });

        it('decrease the beneficiary reward', async () => {
            await expect(contract.decreaseReward(beneficiary1, new BN(2))).to.eventually.be.fulfilled;
            let _beneficiary1 = await contract.beneficiaries.call(beneficiary1);
            expect(_beneficiary1[0]).to.be.a.bignumber.equal(new BN(8));
        });

        it('cannot decrease the nonexisting beneficiary reward', async () => {
            await expectRevert(
                contract.decreaseReward(nonbeneficiary, new BN(3)),
                "Beneficiary is not exists"
            );
            let _nonbeneficiary = await contract.beneficiaries.call(nonbeneficiary);
            expect(_nonbeneficiary[0]).to.be.a.bignumber.equal(new BN(0));
        });

        it('cannot decrease the beneficiary reward if it`s more than existed', async () => {
            let _beneficiary1 = await contract.beneficiaries.call(beneficiary1);
            expect(_beneficiary1[0]).to.be.a.bignumber.equal(new BN(8));
            await expectRevert(
                contract.decreaseReward(beneficiary1, new BN(8)),
                "Beneficiary reward amount is less or equals zero"
            );
            let _updatedBeneficiary1 = await contract.beneficiaries.call(beneficiary1);
            expect(_updatedBeneficiary1[0]).to.be.a.bignumber.equal(new BN(8));
        });

    });

    describe('withdraw tokens', async () => {
        it('only owner(initialHolder) can call emergencyWithdraw function', async () => {
            await expectRevert(
                contract.emergencyWithdraw(new BN(50), { from: beneficiary2 }),
                "Ownable: caller is not the owner"
            );
            await expect(contract.balanceOf(contract.address)).to.eventually.be.a.bignumber.equal(new BN(100));
        });

        it('cannot withdraw more tokens than in the contract`s balance', async () => {
            await expect(contract.balanceOf(contract.address)).to.eventually.be.a.bignumber.equal(new BN(100));
            await expectRevert(
                contract.emergencyWithdraw(new BN(110)),
                "Contract doesn`t have enough money! "
            );
            await expect(contract.balanceOf(contract.address)).to.eventually.be.a.bignumber.equal(new BN(100));
        });

        it('emergency withdraw some tokens by initialHolder', async () => {
            await expect(contract.balanceOf(contract.address)).to.eventually.be.a.bignumber.equal(new BN(100));
            await expect(contract.balanceOf(initialHolder)).to.eventually.be.a.bignumber.equal(new BN(900));
            await expect(contract.emergencyWithdraw(new BN(30))).to.eventually.be.fulfilled;
            await expect(contract.balanceOf(contract.address)).to.eventually.be.a.bignumber.equal(new BN(70));
            await expect(contract.balanceOf(initialHolder)).to.eventually.be.a.bignumber.equal(new BN(930));
        });

        it('the beneficiary withdraw reward', async () => {
            await expect(contract.claim({ from: beneficiary1 })).to.eventually.be.fulfilled;
            await expect(contract.balanceOf(contract.address)).to.eventually.be.a.bignumber.equal(new BN(62));
            await expect(contract.balanceOf(beneficiary1)).to.eventually.be.a.bignumber.equal(new BN(8));
        });

        it('the beneficiary cannot withdraw reward from the contract because it`s already withdraw', async () => {
            let _beneficiary1 = await contract.beneficiaries.call(beneficiary1);
            expect(_beneficiary1[1]).to.equal(true);
            await expectRevert(
                contract.claim({ from: beneficiary1 }),
                "Reward tokens is already withdrawn"
            );
        });

        it('the beneficiary cannot withdraw reward because not enough tokens on the contract', async () => {
            await expect(contract.emergencyWithdraw(new BN(62))).to.eventually.be.fulfilled;
            await expect(contract.balanceOf(contract.address)).to.eventually.be.a.bignumber.equal(new BN(0));
            await expectRevert(
                contract.claim({ from: beneficiary2 }),
                "Contract doesn`t have enough money! "
            );
        });

        it('reward is locked for beneficiaries', async () => {
            await expect(contract.lockRewards(true)).to.eventually.be.fulfilled;
            await expect(contract.isLocked()).to.eventually.be.equal(true);
        });

        it('the beneficiary cannot withdraw reward from the contract because it is locked', async () => {
            await expect(contract.balanceOf(beneficiary2)).to.eventually.be.a.bignumber.equal(new BN(0));
            await expectRevert(
                contract.claim({ from: beneficiary2 }),
                "Reward is locked"
            );
            expect(contract.balanceOf(beneficiary2)).to.eventually.be.a.bignumber.equal(new BN(0));

            await expect(contract.lockRewards(false)).to.eventually.be.fulfilled;
            await expect(contract.isLocked()).to.eventually.be.equal(false);
        });


        it('cannot decrease the reward if beneficiary is already withdrawn money', async () => {
            await expectRevert(
                contract.decreaseReward(beneficiary1, new BN(3)),
                "Reward tokens is already withdrawn"
            );
        });

        it('rewards is zero', async () => {
            await expect(contract.deposit(new BN(100))).to.eventually.be.fulfilled;
            await contract.addBeneficiary(beneficiary5, new BN(0))
            await expectRevert(contract.claim({ from: beneficiary5 }),
                "Reward is zero");
        });

    });
});