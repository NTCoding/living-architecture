import {
  describe, it, expect 
} from 'vitest';
import {
  render, screen 
} from '@testing-library/react';
import { NodeTypeBadge } from './NodeTypeBadge';

describe('NodeTypeBadge', () => {
  it('renders badge with node-type-badge base class', () => {
    render(<NodeTypeBadge type="API" />);

    const badge = screen.getByTestId('node-type-badge');
    expect(badge).toHaveClass('node-type-badge');
  });

  it('renders UI badge with red/orange gradient', () => {
    render(<NodeTypeBadge type="UI" />);

    const badge = screen.getByTestId('node-type-badge');
    expect(badge).toHaveTextContent('UI');
    expect(badge).toHaveClass('badge-ui');
  });

  it('renders API badge with teal gradient', () => {
    render(<NodeTypeBadge type="API" />);

    const badge = screen.getByTestId('node-type-badge');
    expect(badge).toHaveTextContent('API');
    expect(badge).toHaveClass('badge-api');
  });

  it('renders UseCase badge with purple gradient', () => {
    render(<NodeTypeBadge type="UseCase" />);

    const badge = screen.getByTestId('node-type-badge');
    expect(badge).toHaveTextContent('UseCase');
    expect(badge).toHaveClass('badge-usecase');
  });

  it('renders DomainOp badge with green gradient', () => {
    render(<NodeTypeBadge type="DomainOp" />);

    const badge = screen.getByTestId('node-type-badge');
    expect(badge).toHaveTextContent('DomainOp');
    expect(badge).toHaveClass('badge-domainop');
  });

  it('renders Event badge with orange gradient', () => {
    render(<NodeTypeBadge type="Event" />);

    const badge = screen.getByTestId('node-type-badge');
    expect(badge).toHaveTextContent('Event');
    expect(badge).toHaveClass('badge-event');
  });

  it('renders EventHandler badge with orange gradient', () => {
    render(<NodeTypeBadge type="EventHandler" />);

    const badge = screen.getByTestId('node-type-badge');
    expect(badge).toHaveTextContent('EventHandler');
    expect(badge).toHaveClass('badge-eventhandler');
  });

  it('renders Custom type as JOB badge with indigo gradient', () => {
    render(<NodeTypeBadge type="Custom" />);

    const badge = screen.getByTestId('node-type-badge');
    expect(badge).toHaveTextContent('JOB');
    expect(badge).toHaveClass('badge-custom');
  });
});
