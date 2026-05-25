#!/usr/bin/env python3
"""
Automated deployment setup for Virtual Gallery agents.
Verifies environment, tests all components, and prepares for orchestration.
"""

import os
import sys
import json
import subprocess
import asyncio
from pathlib import Path


class DeploymentSetup:
    """Handle automated deployment setup and verification."""
    
    def __init__(self):
        self.project_root = Path(__file__).parent
        self.agents_dir = self.project_root / "agents"
        self.env_file = self.project_root / ".env.local"
        self.checks = []
    
    def log(self, message: str, level: str = "info"):
        """Log with formatting."""
        emoji = {
            "error": "❌",
            "warning": "⚠️ ",
            "success": "✅",
            "info": "ℹ️ ",
        }.get(level, "•")
        print(f"{emoji} {message}")
    
    def check(self, name: str, condition: bool, details: str = ""):
        """Record check result."""
        self.checks.append({"name": name, "passed": condition, "details": details})
        if condition:
            self.log(f"{name}", "success")
        else:
            self.log(f"{name} - {details}", "error")
        return condition
    
    # ====== Verification Checks ======
    
    def verify_python_version(self) -> bool:
        """Check Python 3.11+"""
        version = sys.version_info
        if version.major >= 3 and version.minor >= 11:
            return self.check(
                "Python version",
                True,
                f"Python {version.major}.{version.minor}.{version.micro}"
            )
        else:
            return self.check(
                "Python version",
                False,
                f"Need 3.11+, have {version.major}.{version.minor}"
            )
    
    def verify_env_file(self) -> bool:
        """Check .env.local exists with required keys."""
        if not self.env_file.exists():
            return self.check(
                ".env.local file",
                False,
                "File not found. Create with Supabase credentials."
            )
        
        # Parse .env
        env_vars = {}
        with open(self.env_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    key, _, value = line.partition("=")
                    env_vars[key.strip()] = value.strip()
        
        required = [
            "NEXT_PUBLIC_SUPABASE_URL",
            "SUPABASE_SECRET_KEY",
            "SUPABASE_SERVICE_KEY",
            "CLAUDE_API_KEY"
        ]
        
        missing = [k for k in required if k not in env_vars]
        
        if missing:
            return self.check(
                ".env.local configuration",
                False,
                f"Missing: {', '.join(missing)}"
            )
        
        return self.check(".env.local configuration", True)
    
    def verify_project_structure(self) -> bool:
        """Check required directories exist."""
        required = [
            self.agents_dir,
            self.agents_dir / "utils",
            self.agents_dir / "memory",
            self.project_root / "supabase" / "migrations",
            self.project_root / ".github" / "agents",
            self.project_root / ".github" / "skills" / "gallery-orchestration",
        ]
        
        all_exist = all(d.exists() for d in required)
        return self.check(
            "Project structure",
            all_exist,
            "All required directories present" if all_exist else "Missing directories"
        )
    
    def verify_migration_files(self) -> bool:
        """Check Supabase migration files exist."""
        migrations = list((self.project_root / "supabase" / "migrations").glob("*.sql"))
        required_count = 2  # 001_create_artworks.sql + 002_agent_orchestration.sql
        
        return self.check(
            "Supabase migrations",
            len(migrations) >= required_count,
            f"Found {len(migrations)} migrations (need {required_count})"
        )
    
    def verify_agent_files(self) -> bool:
        """Check all agent .agent.md files exist."""
        agents_dir = self.project_root / ".github" / "agents"
        agents = list(agents_dir.glob("*.agent.md"))
        required_count = 4
        
        return self.check(
            "VS Code agents",
            len(agents) >= required_count,
            f"Found {len(agents)} agents (need {required_count})"
        )
    
    async def verify_credentials(self) -> bool:
        """Test credentials can be loaded."""
        try:
            sys.path.insert(0, str(self.agents_dir))
            from utils.credentials import validate_credentials
            
            valid = validate_credentials()
            return self.check(
                "Credentials validation",
                valid,
                "All credentials loaded successfully"
            )
        except Exception as e:
            return self.check("Credentials validation", False, str(e))
    
    async def verify_memory_manager(self) -> bool:
        """Test memory manager initialization."""
        try:
            sys.path.insert(0, str(self.agents_dir))
            from utils.hybrid_memory import get_memory_manager
            
            memory = get_memory_manager()
            await memory.set("test", {"test": "value"})
            result = await memory.get("test")
            
            valid = result == {"test": "value"}
            return self.check(
                "Memory manager",
                valid,
                "Local cache working"
            )
        except Exception as e:
            return self.check("Memory manager", False, str(e))
    
    def verify_token_counter(self) -> bool:
        """Test token counter initialization."""
        try:
            sys.path.insert(0, str(self.agents_dir))
            from utils.token_counter import get_token_counter
            
            counter = get_token_counter()
            budgets = counter.usage["budget"]
            
            valid = (
                budgets["claude_tokens"] == 30000 and
                budgets["api_calls"] == 100000
            )
            
            return self.check(
                "Token counter",
                valid,
                f"Budgets: {budgets['claude_tokens']} Claude, {budgets['api_calls']} API"
            )
        except Exception as e:
            return self.check("Token counter", False, str(e))
    
    # ====== Setup Actions ======
    
    def ensure_memory_directory(self):
        """Create memory directory if missing."""
        memory_dir = self.agents_dir / "memory"
        memory_dir.mkdir(parents=True, exist_ok=True)
        self.log("Memory directory ready", "success")
    
    def ensure_logs_directory(self):
        """Create logs directory if missing."""
        logs_dir = self.agents_dir / "logs"
        logs_dir.mkdir(parents=True, exist_ok=True)
        self.log("Logs directory ready", "success")
    
    def install_dependencies(self) -> bool:
        """Install Python dependencies."""
        try:
            self.log("Installing Python dependencies...")
            
            requirements = [
                "supabase>=2.0",
                "python-dotenv>=1.0",
                "pydantic>=2.0",
                "pytest>=7.0",
                "pytest-asyncio>=0.21",
                "aiohttp>=3.8",
            ]
            
            for package in requirements:
                subprocess.run(
                    [sys.executable, "-m", "pip", "install", "-q", package],
                    check=True
                )
            
            self.log("Dependencies installed", "success")
            return True
        except Exception as e:
            self.log(f"Dependency installation failed: {e}", "error")
            return False
    
    # ====== Report ======
    
    def print_summary(self):
        """Print verification summary."""
        passed = sum(1 for c in self.checks if c["passed"])
        total = len(self.checks)
        
        print("\n" + "=" * 60)
        print(f"DEPLOYMENT VERIFICATION: {passed}/{total} checks passed")
        print("=" * 60 + "\n")
        
        for check in self.checks:
            status = "✅" if check["passed"] else "❌"
            print(f"{status} {check['name']}")
            if check["details"]:
                print(f"   → {check['details']}")
        
        print("\n" + "=" * 60)
        if passed == total:
            print("✅ ALL CHECKS PASSED - Ready to run orchestration!")
            print("\nNext step:")
            print("  cd agents")
            print("  python cli_orchestrator.py")
        else:
            print(f"⚠️  {total - passed} checks failed - Fix issues above before deploying")
        print("=" * 60 + "\n")
    
    async def run_all(self):
        """Run complete deployment setup."""
        print("\n" + "=" * 60)
        print("VIRTUAL GALLERY - DEPLOYMENT SETUP")
        print("=" * 60 + "\n")
        
        self.log("Starting verification checks...")
        print()
        
        # Sync checks
        self.verify_python_version()
        self.verify_project_structure()
        self.verify_migration_files()
        self.verify_agent_files()
        self.verify_env_file()
        self.verify_token_counter()
        
        # Async checks
        await self.verify_credentials()
        await self.verify_memory_manager()
        
        print()
        
        # Setup
        self.ensure_memory_directory()
        self.ensure_logs_directory()
        self.install_dependencies()
        
        print()
        self.print_summary()


async def main():
    """Main entry point."""
    setup = DeploymentSetup()
    await setup.run_all()


if __name__ == "__main__":
    asyncio.run(main())
