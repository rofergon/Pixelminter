import { useMemo } from 'react';
import { useAddressName } from '@/hooks/useAddressName';

interface ArtistSelectOptionProps {
  value: string;
  label: string;
}

const isAddress = (value: string | number): boolean => {
  if (typeof value !== 'string') {
    return false;
  }
  return /^0x[a-fA-F0-9]{40}$/.test(value);
};

export const ArtistSelectOption = ({ value, label }: ArtistSelectOptionProps) => {
  const shouldResolve = useMemo(() => isAddress(label), [label]);
  const { displayName } = useAddressName(shouldResolve ? label : null);
  const resolvedLabel = shouldResolve ? displayName : label;

  return (
    <option value={value}>
      {resolvedLabel}
    </option>
  );
};

export default ArtistSelectOption;
