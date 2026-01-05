import {
  describe, it, expect, vi 
} from 'vitest';
import {
  render, screen 
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  FilterTabs, DomainFilter, TypeFilter 
} from './ChangeFilters';

describe('FilterTabs', () => {
  it('renders all filter options', () => {
    render(<FilterTabs activeFilter="all" onFilterChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'All Changes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Added' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Removed' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Modified' })).toBeInTheDocument();
  });

  it('calls onFilterChange when filter button is clicked', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    render(<FilterTabs activeFilter="all" onFilterChange={onFilterChange} />);

    await user.click(screen.getByRole('button', { name: 'Added' }));

    expect(onFilterChange).toHaveBeenCalledWith('added');
  });

  it('applies active styling to selected filter', () => {
    render(<FilterTabs activeFilter="removed" onFilterChange={vi.fn()} />);

    const removedButton = screen.getByRole('button', { name: 'Removed' });
    expect(removedButton).toHaveClass('bg-[var(--primary)]');
  });
});

describe('DomainFilter', () => {
  const domains = ['orders', 'shipping', 'inventory'];

  it('renders all domain options', () => {
    render(<DomainFilter domains={domains} activeDomain={null} onDomainChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'orders' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'shipping' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'inventory' })).toBeInTheDocument();
  });

  it('calls onDomainChange with domain when clicked', async () => {
    const user = userEvent.setup();
    const onDomainChange = vi.fn();
    render(<DomainFilter domains={domains} activeDomain={null} onDomainChange={onDomainChange} />);

    await user.click(screen.getByRole('button', { name: 'shipping' }));

    expect(onDomainChange).toHaveBeenCalledWith('shipping');
  });

  it('calls onDomainChange with null when active domain is clicked again', async () => {
    const user = userEvent.setup();
    const onDomainChange = vi.fn();
    render(
      <DomainFilter domains={domains} activeDomain="shipping" onDomainChange={onDomainChange} />,
    );

    await user.click(screen.getByRole('button', { name: 'shipping' }));

    expect(onDomainChange).toHaveBeenCalledWith(null);
  });

  it('applies active styling to selected domain', () => {
    render(<DomainFilter domains={domains} activeDomain="orders" onDomainChange={vi.fn()} />);

    const ordersButton = screen.getByRole('button', { name: 'orders' });
    expect(ordersButton).toHaveClass('bg-[var(--primary)]');
  });
});

describe('TypeFilter', () => {
  const types = ['API', 'UseCase', 'Event'];

  it('renders all type options', () => {
    render(<TypeFilter types={types} activeType={null} onTypeChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'API' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'UseCase' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Event' })).toBeInTheDocument();
  });

  it('calls onTypeChange with type when clicked', async () => {
    const user = userEvent.setup();
    const onTypeChange = vi.fn();
    render(<TypeFilter types={types} activeType={null} onTypeChange={onTypeChange} />);

    await user.click(screen.getByRole('button', { name: 'Event' }));

    expect(onTypeChange).toHaveBeenCalledWith('Event');
  });

  it('calls onTypeChange with null when active type is clicked again', async () => {
    const user = userEvent.setup();
    const onTypeChange = vi.fn();
    render(<TypeFilter types={types} activeType="API" onTypeChange={onTypeChange} />);

    await user.click(screen.getByRole('button', { name: 'API' }));

    expect(onTypeChange).toHaveBeenCalledWith(null);
  });

  it('applies active styling to selected type', () => {
    render(<TypeFilter types={types} activeType="UseCase" onTypeChange={vi.fn()} />);

    const useCaseButton = screen.getByRole('button', { name: 'UseCase' });
    expect(useCaseButton).toHaveClass('bg-[var(--primary)]');
  });
});
