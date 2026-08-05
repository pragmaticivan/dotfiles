# Runbook: Consumer Profile Service scaling incidents

## Overview

The Consumer Profile Service is a NestJS application which is deployed to the shared EKS cluster and it is autoscaled by KEDA based on the SQS queue depth of the `profile-enrichment` queue, and when the queue backs up beyond the configured threshold the ScaledObject will provision additional replicas up to the maxReplicaCount, however if the pods are being OOMKilled the scaling will not help and the operator should instead investigate memory pressure.

## Symptoms

You may observe one or more of the following: elevated queue depth, increased p99 latency on the `/profiles/:id` endpoint, CrashLoopBackOff on one or more pods, or alerts firing in New Relic (the alert policy is called "Consumer Profile - Queue Depth").

## Remediation

1. First you should verify that the pods are actually healthy by executing `kubectl get pods -n consumer-profile` and confirming that no pods are in CrashLoopBackOff or OOMKilled state; if pods have been OOMKilled then you will need to increase the memory limits in the overlay rather than scaling out.
2. Check the ScaledObject to ensure the trigger authentication is working, i.e. that the ClusterTriggerAuthentication has not expired, and if it has expired then rotate the credentials.
3. If the queue depth continues to grow, the maxReplicaCount can be temporarily raised by editing the overlay, but note that this may exhaust the node group capacity.

NOTE: Always page the platform team before you modify the maxReplicaCount in production.

## Rollback

If the change did not help, revert the overlay commit and redeploy. Data loss is not expected because the queue retains messages for 14 days, however if you purge the queue the messages will be permanently deleted and cannot be recovered.
