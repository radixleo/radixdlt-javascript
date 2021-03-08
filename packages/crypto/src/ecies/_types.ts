import { MessageAuthenticationCodeScheme } from '../message-authentication-code/_types'
import { KeyDerivationScheme } from '../key-derivation-functions/_types'
import {
	DecryptionScheme,
	EncryptionScheme,
} from '../symmetric-encryption/_types'
import {
	DiffieHellman,
	DiffieHellmanDecryption,
	DiffieHellmanEncryption,
	DiffieHellmanInput,
} from '../key-exchange/_types'

export type SharedInfo = Readonly<{
	// `s1` (optional shared information), if present, is fed into KDF (Key Derivation Function), that produces a symmetric encryption key
	s1?: Buffer
	// `s2` (optional shared information), if present, is fed into the "tag" (MAC)
	s2?: Buffer
}>

export type ECIESEncryptedMessage = Readonly<{
	cipherText: Buffer // `EM`
	sharedSecret: Buffer // `R`, i.e. ephemeral public key
	tag: Buffer // `D`, e.g. MAC(kM, c||S2)
	toBuffer: () => Buffer // By default:  `C := R || EM || D`, but can be customized.
}>

export type ECIESProcedures = Readonly<{
	diffieHellman: DiffieHellman<DiffieHellmanInput>
	keyDerivationScheme: KeyDerivationScheme
	messageAuthenticationCodeScheme: MessageAuthenticationCodeScheme
}>

export type ECIESEncryptProcedures = ECIESProcedures &
	Readonly<{
		diffieHellman: DiffieHellmanEncryption
		encryptionScheme: EncryptionScheme
	}>

export type ECIESDecryptProcedures = ECIESProcedures &
	Readonly<{
		diffieHellman: DiffieHellmanDecryption
		decryptionScheme: DecryptionScheme
	}>

export type ECIESInput<P extends ECIESProcedures> = Readonly<{
	procedures: P
	sharedInfo?: SharedInfo
}>