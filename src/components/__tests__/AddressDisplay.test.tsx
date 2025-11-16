import React from 'react';
import { render, screen } from '@testing-library/react';
import { AddressDisplay } from '../AddressDisplay';
import { useAddressName } from '@/hooks/useAddressName';

// Mock the useAddressName hook
jest.mock('@/hooks/useAddressName');

describe('AddressDisplay', () => {
  const mockUseAddressName = useAddressName as jest.MockedFunction<typeof useAddressName>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render fallback when no address is provided', () => {
    mockUseAddressName.mockReturnValue({
      displayName: '—',
      isLoading: false,
    });

    render(<AddressDisplay address={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('should render custom fallback text', () => {
    mockUseAddressName.mockReturnValue({
      displayName: 'N/A',
      isLoading: false,
    });

    render(<AddressDisplay address={null} fallback="N/A" />);
    expect(screen.getByText('N/A')).toBeInTheDocument();
  });

  it('should render ENS name when resolved', () => {
    mockUseAddressName.mockReturnValue({
      displayName: 'vitalik.eth',
      isLoading: false,
    });

    render(<AddressDisplay address="0x1234567890123456789012345678901234567890" />);
    expect(screen.getByText('vitalik.eth')).toBeInTheDocument();
  });

  it('should render Basename when resolved', () => {
    mockUseAddressName.mockReturnValue({
      displayName: 'alice.base.eth',
      isLoading: false,
    });

    render(<AddressDisplay address="0x1234567890123456789012345678901234567890" />);
    expect(screen.getByText('alice.base.eth')).toBeInTheDocument();
  });

  it('should render shortened address when no name is resolved', () => {
    mockUseAddressName.mockReturnValue({
      displayName: '0x1234…7890',
      isLoading: false,
    });

    render(<AddressDisplay address="0x1234567890123456789012345678901234567890" />);
    expect(screen.getByText('0x1234…7890')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    mockUseAddressName.mockReturnValue({
      displayName: '',
      isLoading: true,
    });

    render(<AddressDisplay address="0x1234567890123456789012345678901234567890" />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('should not show loading state when showLoading is false', () => {
    mockUseAddressName.mockReturnValue({
      displayName: '',
      isLoading: true,
    });

    render(
      <AddressDisplay 
        address="0x1234567890123456789012345678901234567890" 
        showLoading={false}
      />
    );
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    mockUseAddressName.mockReturnValue({
      displayName: 'test.eth',
      isLoading: false,
    });

    const { container } = render(
      <AddressDisplay 
        address="0x1234567890123456789012345678901234567890" 
        className="font-mono text-blue-500"
      />
    );
    
    const span = container.querySelector('span');
    expect(span).toHaveClass('font-mono', 'text-blue-500');
  });

  it('should have animate-pulse class when loading', () => {
    mockUseAddressName.mockReturnValue({
      displayName: '',
      isLoading: true,
    });

    const { container } = render(
      <AddressDisplay address="0x1234567890123456789012345678901234567890" />
    );
    
    const span = container.querySelector('span');
    expect(span).toHaveClass('animate-pulse');
  });

  it('should handle address updates', () => {
    mockUseAddressName.mockReturnValue({
      displayName: 'alice.eth',
      isLoading: false,
    });

    const { rerender } = render(
      <AddressDisplay address="0x1111111111111111111111111111111111111111" />
    );
    expect(screen.getByText('alice.eth')).toBeInTheDocument();

    mockUseAddressName.mockReturnValue({
      displayName: 'bob.eth',
      isLoading: false,
    });

    rerender(<AddressDisplay address="0x2222222222222222222222222222222222222222" />);
    expect(screen.getByText('bob.eth')).toBeInTheDocument();
  });
});
