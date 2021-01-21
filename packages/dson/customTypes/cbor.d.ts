declare module 'cbor' {
	type Encoder = {
		new (options: EncoderOptions): CBOREncoder
	}
	type EncoderOptions = {
		highWaterMark: number
	}
	type CBOREncoder = {
		_encodeAll: (
			data: (CBOREncodablePrimitive | CBOREncodableObject)[],
		) => Buffer
		pushAny: (
			any:
				| CBOREncodablePrimitive
				| CBOREncodableObject
				| CBOREncodableObject[],
		) => boolean
		push: (chunk: Buffer) => boolean
	}
	type CBOREncodableObject = Readonly<{
		encodeCBOR: (encoder: any) => boolean
	}>
	type CBOREncodablePrimitive = string | number | boolean | Buffer
	export const Encoder: Encoder
}