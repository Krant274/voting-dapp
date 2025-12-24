export const CONTRACT_ADDRESS = "0x41109b71957D304cd61B8c53511462200835FAc0"; 
export const CONTRACT_ABI = [
  "function admin() view returns (address)",
  "function votingActive() view returns (bool)",
  "function currentElectionId() view returns (uint256)",
  "function startNewElection()",
  "function stopVoting()",
  "function registerCandidate(string _name, string _description)",
  "function vote(uint256 _candidateId)",
  "function getResults() view returns (uint256[] ids, string[] names, string[] descriptions, uint256[] voteCounts)",
  "function hasVoted(uint256 electionId, address voter) view returns (bool)",
  "function getWinner() view returns (string[] winnerNames, uint256 winnerVotes)",
  "event ElectionStarted(uint256 electionId)",
  "event ElectionStopped(uint256 electionId)",
  "event VoteCasted(uint256 electionId, address voter, uint256 candidateId)",
  "event CandidateRegistered(uint256 electionId, string name)"
];