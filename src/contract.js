export const CONTRACT_ADDRESS = "0xB3BD489c24CC05e92F2769d9e0A2B84099cFf18f"; 
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