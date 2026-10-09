using System;
using BCrypt.Net;

namespace HashGen {
    class Program {
        static void Main(string[] args) {
            string hash = BCrypt.Net.BCrypt.HashPassword("admin123", workFactor: 11);
            Console.WriteLine(hash);
        }
    }
}
