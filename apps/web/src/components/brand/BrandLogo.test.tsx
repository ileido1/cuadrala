// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { BrandLogo } from './BrandLogo';

afterEach(cleanup);

describe('BrandLogo', () => {
  it('renders the official bicolor asset with accessible text', () => {
    const { getByRole } = render(<BrandLogo />);

    const logo = getByRole('img', { name: 'Cuádrala' });
    expect(logo.getAttribute('src')).toContain('/brand/logo.svg');
  });

  it('renders the official white asset when requested', () => {
    const { getByRole } = render(<BrandLogo variant="white" />);

    const logo = getByRole('img', { name: 'Cuádrala' });
    expect(logo.getAttribute('src')).toContain('/brand/logo-white.svg');
  });
});
