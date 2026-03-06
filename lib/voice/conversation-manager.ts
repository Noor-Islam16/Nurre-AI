import { VoiceConversation } from '@elevenlabs/client'

/**
 * Singleton manager for global ElevenLabs conversation
 * Ensures only one conversation exists across all components
 */
class ConversationManager {
  private static instance: ConversationManager
  private conversation: VoiceConversation | null = null
  private localStream: MediaStream | null = null
  private monitorInterval: number | null = null

  private constructor() {}

  static getInstance(): ConversationManager {
    if (!ConversationManager.instance) {
      ConversationManager.instance = new ConversationManager()
    }
    return ConversationManager.instance
  }

  getConversation(): VoiceConversation | null {
    return this.conversation
  }

  setConversation(conversation: VoiceConversation | null): void {
    this.conversation = conversation
  }

  getLocalStream(): MediaStream | null {
    return this.localStream
  }

  setLocalStream(stream: MediaStream | null): void {
    this.localStream = stream
  }

  getMonitorInterval(): number | null {
    return this.monitorInterval
  }

  setMonitorInterval(interval: number | null): void {
    this.monitorInterval = interval
  }

  async cleanup(): Promise<void> {
    // Stop monitoring interval
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval)
      this.monitorInterval = null
    }

    // End ElevenLabs conversation
    try {
      if (this.conversation) {
        await this.conversation.endSession()
      }
    } catch (error) {
      console.warn('Error ending conversation:', error)
    }
    this.conversation = null

    // Stop local media stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop())
      this.localStream = null
    }
  }

  isActive(): boolean {
    return this.conversation !== null
  }
}

export const conversationManager = ConversationManager.getInstance()
