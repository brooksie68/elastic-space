# admin

## Purpose

The public site is a maze.
The admin is the map room.

Visitors should drift, stumble, and discover. You should be able to see the whole organism at once, open any page directly, and change whatever needs changing without playing hide-and-seek with your own project.

## Core Requirement

The admin must contain a true directory of all content.

That means:

- every world appears there, even if hidden from public navigation
- drafts, live worlds, retired worlds, and secret worlds all show up
- every world has a direct edit path
- route relationships are visible
- assets and metadata are visible

## Primary Views

### 1. Directory

The default admin screen should be a complete list of worlds with:

- title
- slug
- status
- creator
- tags
- moods
- era
- rarity
- drift on or off
- last modified later on

This view should be sortable and filterable, not cute.

### 2. World Editor

Each world should have a direct detail screen where you can edit:

- metadata
- content source
- route rules
- publish state
- warnings
- soundtrack references
- admin notes

### 3. Route Graph

You should be able to inspect the network visually:

- what links where
- what is isolated
- what is over-linked
- what is only reachable through secret conditions

### 4. Submission Queue

Contributed work should land in a review area before it enters the maze.

## Key Principle

Public opacity.
Private clarity.

Those are not in conflict. They are the whole trick.

## MVP Admin

Version one only needs:

1. a directory table of all worlds
2. filters by status, creator, tag, and mood
3. a detail editor for one world at a time
4. visibility into outbound and inbound routes
5. publish and hide controls

If that exists, the project is governable instead of merely wild.
