import assert from 'node:assert/strict';
import test from 'node:test';
import { bindingsAreLoopback } from '../local/network-security.mjs';

const container = (bindings) => ({ NetworkSettings: { Ports: { '5432/tcp': bindings } } });

test('local network: accepts only effective IPv4/IPv6 loopback publications', () => {
  assert.equal(bindingsAreLoopback([container([{ HostIp: '127.0.0.1' }, { HostIp: '::1' }])]), true);
  assert.equal(bindingsAreLoopback([container(null)]), true);
});

test('local network: wildcard, unspecified and LAN publications require external protection', () => {
  for (const HostIp of ['0.0.0.0', '::', '', undefined, '192.168.1.2']) {
    assert.equal(bindingsAreLoopback([container([{ HostIp }])]), false);
  }
  assert.equal(bindingsAreLoopback([container([{ HostIp: '127.0.0.1' }]), container([{ HostIp: '::' }])]), false);
});
