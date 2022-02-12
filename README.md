# Tradegen Subgraph

Tradegen is a decentralized asset management and algo trading platform on Celo.

This subgraph dynamically tracks any pools and NFT pools created on Tradegen. It tracks of the current state of Tradegen contracts, and contains derived stats for things like historical data and USD prices.

- aggregated data across pools and NFT pools,
- data on individual pools and NFT pools,
- data on transactions
- data on user accounts
- historical data on Tradegen, pools or NFT pools, aggregated by day

## Running Locally

Make sure to update package.json settings to point to your own graph account.

## Queries

Below are a few ways to show how to query the tradegen-subgraph for data. The queries show most of the information that is queryable, but there are many other filtering options that can be used, just check out the [querying api](https://thegraph.com/docs/graphql-api). These queries can be used locally or in The Graph Explorer playground.
