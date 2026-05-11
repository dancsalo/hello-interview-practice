import type { ZooKeeperExample } from '../../../lib/types.js';
import { basicsExample } from './01-basics/index.js';
import { watchesExample } from './02-watches/index.js';
import { configManagementExample } from './03-config-management/index.js';
import { serviceDiscoveryExample } from './04-service-discovery/index.js';
import { leaderElectionExample } from './05-leader-election/index.js';
import { distributedLocksExample } from './06-distributed-locks/index.js';
import { sessionManagementExample } from './07-session-management/index.js';
import { ensembleConsensusExample } from './08-ensemble-consensus/index.js';

export const zookeeperExamples: ZooKeeperExample[] = [
  basicsExample,
  watchesExample,
  configManagementExample,
  serviceDiscoveryExample,
  leaderElectionExample,
  distributedLocksExample,
  sessionManagementExample,
  ensembleConsensusExample,
];
