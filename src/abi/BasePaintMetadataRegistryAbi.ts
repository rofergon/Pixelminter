export const BasePaintMetadataRegistryAbi = [
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'id',
        type: 'uint256',
      },
    ],
    name: 'getMetadata',
    outputs: [
      {
        components: [
          {
            internalType: 'string',
            name: 'name',
            type: 'string',
          },
          {
            internalType: 'uint24[]',
            name: 'palette',
            type: 'uint24[]',
          },
          {
            internalType: 'uint96',
            name: 'size',
            type: 'uint96',
          },
          {
            internalType: 'address',
            name: 'proposer',
            type: 'address',
          },
        ],
        internalType: 'struct BasePaintMetadataRegistry.Metadata',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
];
