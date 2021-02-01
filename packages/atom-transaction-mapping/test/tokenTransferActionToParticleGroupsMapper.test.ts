import { tokenTransferActionToParticleGroupsMapper } from '../src/tokenTransferActionToParticleGroupsMapper'
import { TransferTokensAction, transferTokensAction } from '@radixdlt/actions'
import { Address, addressFromBase58String } from '@radixdlt/crypto'
import {
	AnyUpParticle,
	fixedSupplyTokenDefinitionParticle,
	resourceIdentifierFromAddressAndName,
	Spin,
	TokenDefinitionParticleInput,
	transferrableTokensParticle,
	TransferrableTokensParticle,
	upParticle,
	UpParticle,
} from '@radixdlt/atom'
import {
	amountFromUInt256,
	Denomination,
	positiveAmountFromUnsafe,
} from '@radixdlt/primitives'
import { UInt256 } from '@radixdlt/uint256'
import { toAddress } from '../../atom/test/helpers/utility'

describe('TokenTransferActionToParticleGroupsMapper', () => {
	const mapper = tokenTransferActionToParticleGroupsMapper()

	const alice = toAddress(
		'9S8khLHZa6FsyGo634xQo9QwLgSHGpXHHW764D5mPYBcrnfZV6RT',
	)
	const bob = toAddress(
		'9S9LHeQNFpNJYqLtTJeAbos1LCC5Q7HBiGwPf2oju3NRq5MBKAGt',
	)

	const carol = toAddress(
		'9S8sKfN3wGyJdfyu9RwWvGKtZqq3R1NaxwT63VXi5dEZ6dUJXLyR',
	)

	const dan = toAddress(
		'9SBFdPAkvquf9XX82D2Z9DzL2WdmNQGcrxFUnKpVytpkMjZWD9Rb',
	)

	const symbol = 'FOOBAR'
	const rri = resourceIdentifierFromAddressAndName({
		address: alice,
		name: symbol,
	})

	const name = 'Foobar Coin'

	const tokenDefInput = <TokenDefinitionParticleInput>{
		symbol,
		name,
		address: alice,
	}

	const fixedSupTokDefParticle = fixedSupplyTokenDefinitionParticle({
		...tokenDefInput,
		supply: amountFromUInt256({
			magnitude: UInt256.valueOf(21_000_000),
			denomination: Denomination.Whole,
		})._unsafeUnwrap(),
	})._unsafeUnwrap()

	const makeTransferAction = (amount: number): TransferTokensAction => {
		return transferTokensAction({
			to: bob,
			from: alice,
			amount: positiveAmountFromUnsafe(amount)._unsafeUnwrap(),
			resourceIdentifier: rri,
		})
	}

	it(`should fail with 'Unknown token with identifier' error when trying to map with an empty particle list.`, () => {
		const transferAction = makeTransferAction(1337)
		const spunUpParticles: AnyUpParticle[] = []

		const particleGroupsResult = mapper.particleGroupsFromAction({
			action: transferAction,
			upParticles: spunUpParticles,
			addressOfActiveAccount: alice,
		})

		particleGroupsResult.match(
			() => {
				throw Error('expected error, but got none')
			},
			(f) =>
				expect(f.message).toBe(
					`Unknown token with identifier: '${rri.toString()}'`,
				),
		)
	})

	it(`should fail with 'Insufficient Balance' error when trying to map with a particles list with FixedSupplyTokenDefinitionParticle but no transferrable tokens.`, () => {
		const transferAction = makeTransferAction(1337)

		const spunUpParticles: AnyUpParticle[] = [
			upParticle(fixedSupTokDefParticle).eraseToAnyUp(),
		]

		const particleGroupsResult = mapper.particleGroupsFromAction({
			action: transferAction,
			upParticles: spunUpParticles,
			addressOfActiveAccount: alice,
		})

		particleGroupsResult.match(
			() => {
				throw Error('expected error, but got none')
			},
			(f) => expect(f.message).toBe(`Insufficient balance.`),
		)
	})

	const upTTP = (
		amount: number,
		owner?: Address,
	): UpParticle<TransferrableTokensParticle> => {
		return upParticle(
			transferrableTokensParticle({
				granularity: fixedSupTokDefParticle.granularity,
				tokenDefinitionReference:
					fixedSupTokDefParticle.resourceIdentifier,
				address: owner ?? alice,
				amount: positiveAmountFromUnsafe(amount)._unsafeUnwrap(),
			})._unsafeUnwrap(),
		)
	}

	it(`should fail with 'Insufficient Balance' error when trying to map with a particles list with FixedSupplyTokenDefinitionParticle but no enough transferrable tokens.`, () => {
		const transferAction = makeTransferAction(4)

		const spunUpParticles: AnyUpParticle[] = [
			upParticle(fixedSupTokDefParticle),
			upTTP(3),
		].map((p) => p.eraseToAnyUp())

		const particleGroupsResult = mapper.particleGroupsFromAction({
			action: transferAction,
			upParticles: spunUpParticles,
			addressOfActiveAccount: alice,
		})

		particleGroupsResult.match(
			() => {
				throw Error('expected error, but got none')
			},
			(f) => expect(f.message).toBe(`Insufficient balance.`),
		)
	})

	it(`should fail with 'Wrong sender/signer' error when addressOfActiveAcount is someone elses.`, () => {
		expect(alice.equals(carol)).toBe(false)
		const transferAction = makeTransferAction(4)

		const spunUpParticles: AnyUpParticle[] = [
			upParticle(fixedSupTokDefParticle),
			upTTP(2),
			upTTP(3),
		].map((p) => p.eraseToAnyUp())

		const particleGroupsResult = mapper.particleGroupsFromAction({
			action: transferAction,
			upParticles: spunUpParticles,
			addressOfActiveAccount: carol, // <-- WRONG!
		})

		particleGroupsResult.match(
			() => {
				throw Error('expected error, but got none')
			},
			(f) => expect(f.message).toBe(`Wrong sender/signer`),
		)
	})

	it(`should fail with 'Insufficient Balance' error when some of the TTPs belong to someone else.`, () => {
		expect(alice.equals(carol)).toBe(false)
		const transferAction = makeTransferAction(4)

		const spunUpParticles: AnyUpParticle[] = [
			upParticle(fixedSupTokDefParticle),
			upTTP(2, dan),
			upTTP(3),
		].map((p) => p.eraseToAnyUp())

		const particleGroupsResult = mapper.particleGroupsFromAction({
			action: transferAction,
			upParticles: spunUpParticles,
			addressOfActiveAccount: alice,
		})

		particleGroupsResult.match(
			() => {
				throw Error('expected error, but got none')
			},
			(f) => expect(f.message).toBe(`Insufficient balance.`),
		)
	})

	it(`should work with a FixedSupplyTokenDefinitionParticle and some transferrable tokens particles with change back.`, () => {
		const transferAction = makeTransferAction(4)

		const spunUpParticles: AnyUpParticle[] = [
			upParticle(fixedSupTokDefParticle),
			upTTP(2),
			upTTP(3),
		].map((p) => p.eraseToAnyUp())

		const particleGroups = mapper
			.particleGroupsFromAction({
				action: transferAction,
				upParticles: spunUpParticles,
				addressOfActiveAccount: alice,
			})
			._unsafeUnwrap()

		expect(particleGroups.length).toBe(1)
		const spunParticles = particleGroups[0].spunParticles.spunParticles
		expect(spunParticles.length).toBe(4)

		const one = positiveAmountFromUnsafe(1)._unsafeUnwrap()
		const two = positiveAmountFromUnsafe(2)._unsafeUnwrap()
		const three = positiveAmountFromUnsafe(3)._unsafeUnwrap()
		const four = positiveAmountFromUnsafe(4)._unsafeUnwrap()

		const sp0 = spunParticles[0]
		expect(sp0.spin).toBe(Spin.DOWN)
		const p0 = sp0.particle as TransferrableTokensParticle
		expect(p0.amount.equals(two)).toBe(true)

		const sp1 = spunParticles[1]
		expect(sp1.spin).toBe(Spin.DOWN)
		const p1 = sp1.particle as TransferrableTokensParticle
		expect(p1.amount.equals(three)).toBe(true)

		// Change back to Alice
		const sp2 = spunParticles[2]
		expect(sp2.spin).toBe(Spin.UP)
		const p2 = sp2.particle as TransferrableTokensParticle
		expect(p2.amount.equals(one)).toBe(true)
		expect(p2.address.equals(alice)).toBe(true)

		const sp3 = spunParticles[3]
		expect(sp3.spin).toBe(Spin.UP)
		const p3 = sp3.particle as TransferrableTokensParticle
		expect(p3.amount.equals(four)).toBe(true)
		expect(p3.address.equals(bob)).toBe(true)
	})
})
